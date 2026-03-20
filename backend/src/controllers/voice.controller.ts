import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { SttService } from '../services/stt.service';
import { LlmService } from '../services/llm.service';
import { TtsService } from '../services/tts.service';
import { VectorService } from '../vector/vector.service';
import { SupportedLanguage, VoiceQueryResult } from '../types';

@ApiTags('voice')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('voice')
export class VoiceController {
  private readonly logger = new Logger(VoiceController.name);

  constructor(
    private readonly sttService: SttService,
    private readonly llmService: LlmService,
    private readonly ttsService: TtsService,
    private readonly vectorService: VectorService,
  ) {}

  @Post('query')
  @UseInterceptors(FileInterceptor('audio'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Voice Q&A across all user documents' })
  async voiceQuery(
    @UploadedFile() audioFile: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
    @Body('language') language?: SupportedLanguage,
  ): Promise<VoiceQueryResult> {
    const transcription = await this.sttService.transcribe(
      audioFile.buffer,
      audioFile.mimetype,
    );

    const queryLanguage: SupportedLanguage =
      language ?? (transcription.language as SupportedLanguage) ?? 'en';

    const embedding = await this.llmService.generateEmbedding(transcription.text);
    const searchResults = await this.vectorService.search(embedding, user.id);

    const contextChunks = searchResults.map((r) => r.chunkText);
    const answer = await this.llmService.generateAnswer(
      transcription.text,
      contextChunks,
      queryLanguage,
    );

    let audioUrl: string | undefined;
    try {
      const audioBuffer = await this.ttsService.synthesize(answer, queryLanguage);
      audioUrl = `data:audio/wav;base64,${audioBuffer.toString('base64')}`;
    } catch {
      this.logger.warn('TTS unavailable, returning text answer only');
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
