import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from './llm.service';
import { VectorService } from '../vector/vector.service';
import { PrismaService } from '../db/prisma.service';
import { SupportedLanguage } from '../types';

export interface RagSource {
  documentId: string;
  filename: string;
  chunkText: string;
  similarity: number;
}

export interface RagQueryResult {
  answer: string;
  sources: RagSource[];
}

const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ['en', 'de'] as const;

export function toSupportedLanguage(lang: string | undefined): SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(lang ?? '')
    ? (lang as SupportedLanguage)
    : 'en';
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly vectorService: VectorService,
    private readonly prisma: PrismaService,
  ) {}

  async query(
    question: string,
    language: SupportedLanguage,
    userId: string,
  ): Promise<RagQueryResult> {
    const embedding = await this.llmService.generateEmbedding(question);
    this.logger.debug(`Embedding ready (${embedding.length} dims) — running vector search`);

    const searchResults = await this.vectorService.search(embedding, userId);
    this.logger.log(
      `Vector search returned ${searchResults.length} chunk(s): ` +
        searchResults
          .map((r) => `[${r.documentId.slice(0, 8)} sim=${r.similarity.toFixed(3)}]`)
          .join(' '),
    );

    if (searchResults.length === 0) {
      this.logger.warn(`No chunks found for user ${userId} — answer will be based on no context`);
    }

    const contextChunks = searchResults.map((r) => r.chunkText);
    const answer = await this.llmService.generateAnswer(question, contextChunks, language);

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
