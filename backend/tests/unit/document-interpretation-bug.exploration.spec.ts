/**
 * Property 1: Bug Condition – Dummy Embedding & Empty Filename Bug
 *
 * CRITICAL: This test MUST FAIL on unfixed code.
 * Failure confirms the bug exists. Do NOT fix the code to make this pass yet.
 *
 * Bug Condition (isBugCondition):
 *   (a) DocumentUpload: indexDocument() uses dummyEmbedding instead of LlmService.generateEmbedding
 *   (b) ChatQuery: sources contain filename: '' even when document exists in DB
 *
 * Counterexamples expected on unfixed code:
 *   - generateEmbedding is never called (0 calls), dummyEmbedding is used instead
 *   - sources[0].filename === '' even though document exists in DB
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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

// ── App factory for ChatController ────────────────────────────────────────────

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

// ── DocumentsService factory ──────────────────────────────────────────────────

function buildDocumentsService(): DocumentsService {
  return new DocumentsService(
    mockPrismaService as unknown as PrismaService,
    mockVectorService as unknown as VectorService,
    mockLlmService as unknown as LlmService,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Property 1: Bug Condition – Dummy Embedding & Empty Filename Bug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Bug (a): indexDocument() calls LlmService.generateEmbedding for each chunk.
   * On fixed code: generateEmbedding IS called → test PASSES.
   * (On unfixed code this would FAIL because dummyEmbedding was used instead.)
   */
  it('(a) indexDocument() calls LlmService.generateEmbedding for each chunk', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 600 }).filter((s) => s.trim().length > 0),
        async (chunkText) => {
          vi.clearAllMocks();
          mockLlmService.generateEmbedding.mockResolvedValue(Array(768).fill(0.1));
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

          await privateService.indexDocument('doc-1', 'user-1', chunkText, 'en');

          // Fixed code: generateEmbedding must be called at least once per chunk
          expect(mockLlmService.generateEmbedding).toHaveBeenCalled();
        },
      ),
      { numRuns: 10 },
    );
  });

  /**
   * Bug (b): chatQuery() returns non-empty filename in sources.
   * On fixed code: filename is loaded from DB → test PASSES.
   * (On unfixed code this would FAIL because filename was always ''.)
   */
  it('(b) chatQuery() returns non-empty filename in sources', async () => {
    const app = await buildChatApp();

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
        async (message, documentId, filename) => {
          vi.clearAllMocks();
          mockLlmService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
          mockVectorService.search.mockResolvedValue([
            { id: 'chunk-1', documentId, chunkText: 'Some relevant context', similarity: 0.9 },
          ]);
          mockLlmService.generateAnswer.mockResolvedValue('The answer.');
          // Fixed code: DB lookup returns the actual filename
          mockPrismaService.document.findUnique.mockResolvedValue({ id: documentId, filename });

          const res = await request(getServer(app)).post('/chat/query').send({ message });

          expect(res.status).toBe(201);
          expect((res.body as ChatResponse).sources).toHaveLength(1);
          // Fixed code: filename must match what DB returned
          expect((res.body as ChatResponse).sources[0].filename).toBe(filename);
        },
      ),
      { numRuns: 20 },
    );

    await app.close();
  });
});
