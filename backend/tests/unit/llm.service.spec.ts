import { describe, it, expect, vi, beforeEach } from 'vitest';

global.fetch = vi.fn();
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('LLM Service (US1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate an answer from context chunks using Ollama', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'The answer to your question is 42.',
        done: true,
      }),
    });

    const { LlmService } = await import('../../src/services/llm.service');
    const service = new LlmService();
    const answer = await service.generateAnswer(
      'What is the answer?',
      ['The answer is 42.'],
      'en',
    );

    expect(answer).toContain('42');
  });

  it('should handle cross-language query (EN query on DE document)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'Die Antwort ist 42.',
        done: true,
      }),
    });

    const { LlmService } = await import('../../src/services/llm.service');
    const service = new LlmService();
    const answer = await service.generateAnswer(
      'What is the answer?',
      ['Die Antwort ist 42. (German context)'],
      'en',
    );

    expect(typeof answer).toBe('string');
    expect(answer.length).toBeGreaterThan(0);
  });

  it('should throw on Ollama API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    });

    const { LlmService } = await import('../../src/services/llm.service');
    const service = new LlmService();

    await expect(
      service.generateAnswer('question?', [], 'en'),
    ).rejects.toThrow('LLM generation failed');
  });
});
