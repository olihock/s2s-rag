import {
  Controller,
  Post,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Param,
  Patch,
  Logger,
  Response as Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { DocumentsService } from '../services/documents.service';
import { SttService } from '../services/stt.service';
import { LlmService } from '../services/llm.service';
import { TtsService } from '../services/tts.service';
import { VectorService } from '../vector/vector.service';
import { SupportedLanguage, VoiceQueryResult } from '../types';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  private readonly logger = new Logger(DocumentsController.name);

  constructor(
    private readonly documentsService: DocumentsService,
    private readonly sttService: SttService,
    private readonly llmService: LlmService,
    private readonly ttsService: TtsService,
    private readonly vectorService: VectorService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a PDF document' })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('folderId') folderId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.uploadPdf(file, user.id, folderId);
  }

  @Get()
  @ApiOperation({ summary: 'List user documents' })
  async listDocuments(@CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.listDocuments(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a document by ID' })
  async getDocument(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.findById(id, user.id);
  }

  @Patch(':id/exclude')
  @ApiOperation({ summary: 'Exclude a document from search' })
  async excludeFromSearch(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.documentsService.excludeFromSearch(id, user.id);
    return { message: 'Document excluded from search' };
  }

  @Patch(':id/re-enable')
  @ApiOperation({ summary: 'Re-enable a document in search' })
  async reEnableSearch(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.documentsService.reEnableSearch(id, user.id);
    return { message: 'Document re-enabled in search' };
  }

  @Post(':id/query')
  @UseInterceptors(FileInterceptor('audio'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Voice Q&A on document(s)' })
  async voiceQuery(
    @Param('id') _id: string,
    @UploadedFile() audioFile: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
    @Body('language') language?: SupportedLanguage,
  ): Promise<VoiceQueryResult> {
    // Transcribe audio
    const transcription = await this.sttService.transcribe(
      audioFile.buffer,
      audioFile.mimetype,
    );

    const queryLanguage: SupportedLanguage = language ?? (transcription.language as SupportedLanguage) ?? 'en';

    // Generate query embedding and search
    const embedding = await this.llmService.generateEmbedding(transcription.text);
    const searchResults = await this.vectorService.search(embedding, user.id);

    const contextChunks = searchResults.map((r) => r.chunkText);

    // Generate LLM answer
    const answer = await this.llmService.generateAnswer(
      transcription.text,
      contextChunks,
      queryLanguage,
    );

    // Synthesize speech
    let audioUrl: string | undefined;
    try {
      const audioBuffer = await this.ttsService.synthesize(answer, queryLanguage);
      const base64Audio = audioBuffer.toString('base64');
      audioUrl = `data:audio/wav;base64,${base64Audio}`;
    } catch {
      this.logger.warn('TTS synthesis failed, returning text-only answer');
    }

    return {
      transcription: transcription.text,
      answer,
      audioUrl,
      sources: searchResults.map((r) => ({
        documentId: r.documentId,
        filename: '',
        chunkText: r.chunkText,
        similarity: r.similarity,
      })),
      language: queryLanguage,
    };
  }
}
