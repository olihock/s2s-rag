import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  UnauthorizedException,
  ServiceUnavailableException,
  ExecutionContext,
} from '@nestjs/common';
import type { Server } from 'http';
import request from 'supertest';
import { ChatController } from '../../src/controllers/chat.controller';
import { LlmService } from '../../src/services/llm.service';
import { VectorService } from '../../src/vector/vector.service';
import { JwtAuthGuard } from '../../src/auth/jwt-auth.guard';
import { AllExceptionsFilter } from '../../src/middleware/all-exceptions.filter';
import { PrismaService } from '../../src/db/prisma.service';

interface ChatResponse {
  answer: string;
  sources: { documentId: string; filename: string; chunkText: string; similarity: number }[];
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

const mockPrismaService = {
  document: {
    findUnique: vi.fn(),
  },
};

// ── Guard helpers ──────────────────────────────────────────────────────────────

/** Guard that always passes and injects a fake user into request.user */
const passingGuard = {
  canActivate: (ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<{ user: { id: string; email: string } }>();
    req.user = { id: 'user-test-id', email: 'test@example.com' };
    return true;
  },
};

/** Guard that always throws 401 */
const failingGuard = {
  canActivate: () => {
    throw new UnauthorizedException();
  },
};

// ── Shared app factory ─────────────────────────────────────────────────────────

async function buildApp(
  guard: typeof passingGuard | typeof failingGuard,
): Promise<INestApplication> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    controllers: [ChatController],
    providers: [
      { provide: LlmService, useValue: mockLlmService },
      { provide: VectorService, useValue: mockVectorService },
      { provide: PrismaService, useValue: mockPrismaService },
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue(guard)
    .compile();

  // Manually inject mocks into the controller instance (needed because Vitest's
  // esbuild transform doesn't emit decorator metadata for constructor injection)
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

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ChatController – unit tests', () => {
  describe('with valid JWT', () => {
    let app: INestApplication;

    beforeEach(async () => {
      vi.clearAllMocks();
      app = await buildApp(passingGuard);

      mockLlmService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      mockVectorService.search.mockResolvedValue([
        { id: 'chunk-1', documentId: 'doc-1', chunkText: 'Some context', similarity: 0.9 },
      ]);
      mockLlmService.generateAnswer.mockResolvedValue('The answer is 42.');
      mockPrismaService.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        filename: 'test-document.pdf',
      });
    });

    afterEach(async () => {
      await app.close();
    });

    it('valid body → 200 + { answer, sources }', async () => {
      const res = await request(getServer(app))
        .post('/chat/query')
        .send({ message: 'What is the answer?' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('answer', 'The answer is 42.');
      expect(res.body).toHaveProperty('sources');
      expect(Array.isArray((res.body as ChatResponse).sources)).toBe(true);
    });

    it('empty message → 400', async () => {
      const res = await request(getServer(app)).post('/chat/query').send({ message: '' });

      expect(res.status).toBe(400);
    });

    it('message only whitespace → 400', async () => {
      const res = await request(getServer(app)).post('/chat/query').send({ message: '   ' });

      expect(res.status).toBe(400);
    });

    it('LLM not reachable → 503', async () => {
      mockLlmService.generateAnswer.mockRejectedValue(
        new ServiceUnavailableException('LLM generation failed'),
      );

      const res = await request(getServer(app))
        .post('/chat/query')
        .send({ message: 'What is the answer?' });

      expect(res.status).toBe(503);
    });
  });

  describe('without JWT', () => {
    let app: INestApplication;

    beforeEach(async () => {
      vi.clearAllMocks();
      app = await buildApp(failingGuard);
    });

    afterEach(async () => {
      await app.close();
    });

    it('missing JWT → 401', async () => {
      const res = await request(getServer(app)).post('/chat/query').send({ message: 'Hello' });

      expect(res.status).toBe(401);
    });
  });
});
