import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { LlmService } from '../services/llm.service';
import { VectorService } from '../vector/vector.service';
import { PrismaService } from '../db/prisma.service';
import { SupportedLanguage, ChatQueryResult } from '../types';
import { UseGuards } from '@nestjs/common';

export class ChatQueryDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsOptional()
  @IsIn(['en', 'de'])
  language?: SupportedLanguage;
}

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly vectorService: VectorService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('query')
  @ApiOperation({ summary: 'Text Q&A across all user documents' })
  async chatQuery(
    @Body() dto: ChatQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ChatQueryResult> {
    const queryLanguage: SupportedLanguage = dto.language ?? 'en';

    const embedding = await this.llmService.generateEmbedding(dto.message);
    const searchResults = await this.vectorService.search(embedding, user.id);

    const contextChunks = searchResults.map((r) => r.chunkText);
    const answer = await this.llmService.generateAnswer(dto.message, contextChunks, queryLanguage);

    const sources = await Promise.all(
      searchResults.map(async (r) => {
        const doc = await this.prisma.document.findUnique({ where: { id: r.documentId } });
        return {
          documentId: r.documentId,
          filename: doc?.filename ?? '',
          chunkText: r.chunkText,
          similarity: r.similarity,
        };
      }),
    );

    return { answer, sources };
  }
}
