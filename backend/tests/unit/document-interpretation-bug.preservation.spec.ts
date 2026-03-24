/**
 * Property 2: Preservation – Unverändertes Verhalten für Nicht-Bug-Eingaben
 *
 * Observation-first methodology:
 *   Run UNFIXED code with non-buggy inputs (isBugCondition = false) and observe behavior.
 *
 * Observed on unfixed code:
 *   - chatQuery() with empty search results → sources: [] (unchanged)
 *   - generateEmbedding returning null-vector (Ollama down) → upload not aborted
 *   - documentId, chunkText, similarity in sources are passed through unchanged
 *   - chatQuery() without search results → answer is still returned
 *
 * These tests PASS on unfixed code (baseline) and must still PASS after the fix.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ChatController } from '../../src/controllers/chat.controller';
import { LlmService } from '../../src/services/llm.service';
import { VectorService } from '../../src/vector/vector.service';
import { JwtAuthGuard } from '../../src/auth/jwt-auth.guard';
import { AllExceptionsFilter } from '../../src/middleware/all-exceptions.filter';
import { DocumentsService } from '../../src/services/documents.service';
import { PrismaService } from '../../src/db/prisma.service';
import type { Server } from 'http';

interface ChatResponse {
  answer: string;
  sources: { documentId: string; filename: string; chunkText: string; similarity: number }[];
}

const getServer = (app: INestApplication): Server => app.getHttpServer() as Server;

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockLlmService = {
  generateEmbedding: vi.fn(),
  generateAnswer: vi.fn(),
};

const mockVectorService = {
  search: vi.fn(),
  insertChunks: vi.fn(),
};

const mockPrismaService = {
  document: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
};

const passingGuard = {
  canActivate: (ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<{ user: { id: string; email: string } }>();
    req.user = { id: 'user-test-id', email: 'test@example.com' };
    return true;
  },
};

// ── Factories ─────────────────────────────────────────────────────────────────

async function buildChatApp(): Promise<INestApplication> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    controllers: [ChatController],
    providers: [
      { provide: LlmService, useValue: mockLlmService },
      { provide: VectorService, useValue: mockVectorService },
      { provide: PrismaService, useValue: mockPrismaService },
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue(passingGuard)
    .compile();

  const controller = moduleRef.get(ChatController);
  Object.assign(controller, {
    llmService: mockLlmService,
    vectorService: mockVectorService,
    prisma: mockPrismaService,
  });

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  return app;
}

function buildDocumentsService(): DocumentsService {
  return new DocumentsService(
    mockPrismaService as unknown as PrismaService,
    mockVectorService as unknown as VectorService,
    mockLlmService as unknown as LlmService,
  );
}

// ── Preservation Tests ────────────────────────────────────────────────────────

describe('Property 2: Preservation – Unverändertes Verhalten für Nicht-Bug-Eingaben', () => {
  let app: INestApplication;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildChatApp();
  });

  afterEach(async () => {
    await app.close();
  });

  /**
   * Preservation 3.2: chatQuery() with no search results → sources: []
   * Observed on unfixed code: empty sources array is returned unchanged.
   */
  it('Preservation 3.2: chatQuery() with empty search results returns sources: []', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        async (message) => {
          vi.clearAllMocks();
          mockLlmService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
          mockVectorService.search.mockResolvedValue([]);
          mockLlmService.generateAnswer.mockResolvedValue('No relevant context found.');

          const res = await request(getServer(app)).post('/chat/query').send({ message });

          expect(res.status).toBe(201);
          expect((res.body as ChatResponse).sources).toEqual([]);
          expect(typeof (res.body as ChatResponse).answer).toBe('string');
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Preservation 3.6: documentId, chunkText, similarity are passed through unchanged.
   * Observed on unfixed code: these fields are always present and match mock values.
   */
  it('Preservation 3.6: documentId, chunkText, similarity are passed through unchanged in sources', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        async (message, documentId, chunkText, similarity) => {
          vi.clearAllMocks();
          mockLlmService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
          mockVectorService.search.mockResolvedValue([
            { id: 'chunk-1', documentId, chunkText, similarity },
          ]);
          mockLlmService.generateAnswer.mockResolvedValue('Answer.');

          const res = await request(getServer(app)).post('/chat/query').send({ message });

          expect(res.status).toBe(201);
          expect((res.body as ChatResponse).sources).toHaveLength(1);
          expect((res.body as ChatResponse).sources[0].documentId).toBe(documentId);
          expect((res.body as ChatResponse).sources[0].chunkText).toBe(chunkText);
          expect((res.body as ChatResponse).sources[0].similarity).toBeCloseTo(similarity, 5);
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Preservation 3.3: Ollama not reachable → generateEmbedding returns null-vector,
   * upload is not aborted (graceful degradation).
   * Observed on unfixed code: insertChunks is still called even with null-vector.
   */
  it('Preservation 3.3: Ollama unavailable → null-vector fallback, upload not aborted', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 600 }).filter((s) => s.trim().length > 0),
        async (chunkText) => {
          vi.clearAllMocks();
          // Simulate Ollama returning null-vector (graceful degradation in LlmService)
          mockLlmService.generateEmbedding.mockResolvedValue(Array(768).fill(0));
          mockVectorService.insertChunks.mockResolvedValue(undefined);

          const service = buildDocumentsService();
          const privateService = service as unknown as {
            indexDocument: (
              id: string,
              ownerId: string,
              text: string,
              lang: string,
            ) => Promise<void>;
          };

          // Should not throw even with null-vector embedding
          await expect(
            privateService.indexDocument('doc-1', 'user-1', chunkText, 'en'),
          ).resolves.not.toThrow();

          // insertChunks must still be called (upload not aborted)
          expect(mockVectorService.insertChunks).toHaveBeenCalled();
        },
      ),
      { numRuns: 10 },
    );
  });

  /**
   * Preservation 3.4: answer is returned even when context doesn't contain the answer.
   * Observed on unfixed code: LLM answer is always forwarded regardless of content.
   */
  it('Preservation 3.4: answer is always returned from LLM regardless of context', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1 }),
        async (message, llmAnswer) => {
          vi.clearAllMocks();
          mockLlmService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
          mockVectorService.search.mockResolvedValue([]);
          mockLlmService.generateAnswer.mockResolvedValue(llmAnswer);

          const res = await request(getServer(app)).post('/chat/query').send({ message });

          expect(res.status).toBe(201);
          expect((res.body as ChatResponse).answer).toBe(llmAnswer);
        },
      ),
      { numRuns: 50 },
    );
  });
});
