import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext } from '@nestjs/common';
import type { Server } from 'http';
import request from 'supertest';
import * as fc from 'fast-check';
import { ChatController } from '../../src/controllers/chat.controller';
import { LlmService } from '../../src/services/llm.service';
import { VectorService } from '../../src/vector/vector.service';
import { JwtAuthGuard } from '../../src/auth/jwt-auth.guard';
import { AllExceptionsFilter } from '../../src/middleware/all-exceptions.filter';
import { PrismaService } from '../../src/db/prisma.service';

interface ChatResponse {
  answer: string;
  sources: { documentId: string; filename: string; chunkText: string; similarity: number }[];
  audioUrl?: string;
}

const getServer = (app: INestApplication): Server => app.getHttpServer() as Server;

// ── Mock services ──────────────────────────────────────────────────────────────

const mockLlmService = {
  generateEmbedding: vi.fn(),
  generateAnswer: vi.fn(),
};

const mockVectorService = {
  search: vi.fn(),
};

const mockTtsService = {
  synthesize: vi.fn(),
};

const mockPrismaService = {
  document: {
    findUnique: vi.fn(),
  },
};

// ── Guard helpers ──────────────────────────────────────────────────────────────

const passingGuard = {
  canActivate: (ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<{ user: { id: string; email: string } }>();
    req.user = { id: 'user-test-id', email: 'test@example.com' };
    return true;
  },
};

// ── Shared app factory ─────────────────────────────────────────────────────────

async function buildApp(): Promise<INestApplication> {
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

// ── Property Tests ─────────────────────────────────────────────────────────────

describe('ChatController – property tests', () => {
  let app: INestApplication;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();

    mockLlmService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
    mockVectorService.search.mockResolvedValue([
      { id: 'chunk-1', documentId: 'doc-1', chunkText: 'Some context', similarity: 0.9 },
    ]);
    mockLlmService.generateAnswer.mockResolvedValue('The answer.');
    mockPrismaService.document.findUnique.mockResolvedValue({
      id: 'doc-1',
      filename: 'test-document.pdf',
    });
  });

  afterEach(async () => {
    await app.close();
  });

  // Feature: text-chatbot, Property 6: Gültige Anfragen rufen RAG-Pipeline auf
  it('Property 6: valid requests invoke RAG pipeline and return answer + sources', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        async (message) => {
          vi.clearAllMocks();
          mockLlmService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
          mockVectorService.search.mockResolvedValue([
            { id: 'chunk-1', documentId: 'doc-1', chunkText: 'Some context', similarity: 0.9 },
          ]);
          mockLlmService.generateAnswer.mockResolvedValue('The answer.');
          mockPrismaService.document.findUnique.mockResolvedValue({
            id: 'doc-1',
            filename: 'test.pdf',
          });

          const res = await request(getServer(app)).post('/chat/query').send({ message });

          expect(res.status).toBe(201);
          expect(mockVectorService.search).toHaveBeenCalledTimes(1);
          expect(mockLlmService.generateAnswer).toHaveBeenCalledTimes(1);
          expect(typeof (res.body as ChatResponse).answer).toBe('string');
          expect(Array.isArray((res.body as ChatResponse).sources)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: text-chatbot, Property 7: Ungültige Eingaben werden mit HTTP 400 abgelehnt
  it('Property 7: invalid message inputs are rejected with HTTP 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(''),
          fc.constant(null),
          fc.constant(undefined),
          fc.stringMatching(/^\s+$/),
        ),
        async (message) => {
          const res = await request(getServer(app)).post('/chat/query').send({ message });

          expect(res.status).toBe(400);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: text-chatbot, Property 9: Sprachparameter-Weiterleitung
  it('Property 9: language parameter is forwarded unchanged to LlmService.generateAnswer()', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constantFrom('en', 'de'), async (language) => {
        vi.clearAllMocks();
        mockLlmService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
        mockVectorService.search.mockResolvedValue([]);
        mockLlmService.generateAnswer.mockResolvedValue('Answer.');

        await request(getServer(app))
          .post('/chat/query')
          .send({ message: 'Test question', language });

        expect(mockLlmService.generateAnswer).toHaveBeenCalledTimes(1);
        const callArgs = mockLlmService.generateAnswer.mock.calls[0] as unknown[];
        expect(callArgs[2]).toBe(language);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: text-chatbot, Property 13: Kein TTS-Aufruf bei Chat-Anfragen
  it('Property 13: TtsService.synthesize() is never called and response has no audioUrl', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        async (message) => {
          vi.clearAllMocks();
          mockLlmService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
          mockVectorService.search.mockResolvedValue([]);
          mockLlmService.generateAnswer.mockResolvedValue('Answer.');
          mockTtsService.synthesize.mockResolvedValue('audio-url');

          const res = await request(getServer(app)).post('/chat/query').send({ message });

          expect(mockTtsService.synthesize).not.toHaveBeenCalled();
          expect(res.body).not.toHaveProperty('audioUrl');
        },
      ),
      { numRuns: 100 },
    );
  });
});
