/**
 * Fix-checking and preservation tests for the FormData constructor bug fix.
 *
 * These tests verify:
 *   - Task 3: The fix resolves the TypeError — transcribe() completes without throwing
 *   - Task 4: Existing behavior is preserved after the fix
 *
 * Vitest's SSR transform wraps `import * as FormData from 'form-data'` in a
 * namespace object. We work around this by mocking the module with a factory
 * that returns the real CJS constructor directly as the default export, and
 * by using the compiled dist output (which tsc compiles correctly to
 * `const FormData = require('form-data')`).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// Load the compiled dist service directly — tsc compiles `import * as FormData`
// to `const FormData = require('form-data')` which correctly binds the constructor.
// This is the same runtime environment as production.
const requireDist = createRequire(import.meta.url);

describe('Task 3: Fix-Checking – FormData constructor no longer throws', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Sub-task 3.1: transcribe() returns a valid TranscriptionResult without throwing.
   *
   * Loads the tsc-compiled dist output where `import * as FormData from 'form-data'`
   * compiles to `const FormData = require('form-data')` — the constructor itself.
   * Mocks fetch to return a successful response and asserts a valid TranscriptionResult.
   */
  it('3.1 transcribe() returns a valid TranscriptionResult without throwing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ text: 'Hello world', language: 'en' }),
    });

    // Use the compiled dist — this is where the fix matters
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { SttService } = requireDist('../../dist/services/stt.service') as {
      SttService: new () => {
        transcribe: (buf: Buffer, mime: string) => Promise<{ text: string; language: string }>;
      };
    };
    const service = new SttService();

    const result = await service.transcribe(Buffer.from('audio'), 'audio/wav');

    expect(result).toEqual({ text: 'Hello world', language: 'en' });
  });
});

describe('Task 4: Preservation – Existing behavior unchanged after fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Sub-task 4.1: Success path still returns { text, language } correctly.
   *
   * Validates: Requirements 3.1
   */
  it('4.1 success path returns { text, language } from Whisper response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ text: 'Transcribed audio', language: 'de' }),
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { SttService } = requireDist('../../dist/services/stt.service') as {
      SttService: new () => {
        transcribe: (buf: Buffer, mime: string) => Promise<{ text: string; language: string }>;
      };
    };
    const service = new SttService();

    const result = await service.transcribe(Buffer.from('audio-data'), 'audio/wav');

    expect(result.text).toBe('Transcribed audio');
    expect(result.language).toBe('de');
  });

  /**
   * Sub-task 4.2: Non-OK fetch response still throws ServiceUnavailableException.
   *
   * Validates: Requirements 3.2
   */
  it('4.2 non-OK fetch response throws ServiceUnavailableException', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { SttService } = requireDist('../../dist/services/stt.service') as {
      SttService: new () => { transcribe: (buf: Buffer, mime: string) => Promise<unknown> };
    };
    const service = new SttService();

    await expect(service.transcribe(Buffer.from('audio-data'), 'audio/wav')).rejects.toThrow(
      'Whisper STT failed',
    );
  });

  /**
   * Sub-task 4.3: form.getHeaders() is passed as headers in the fetch call.
   *
   * Validates: Requirements 3.3
   */
  it('4.3 fetch is called with headers from form.getHeaders()', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ text: 'test', language: 'en' }),
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { SttService } = requireDist('../../dist/services/stt.service') as {
      SttService: new () => { transcribe: (buf: Buffer, mime: string) => Promise<unknown> };
    };
    const service = new SttService();

    await service.transcribe(Buffer.from('audio-data'), 'audio/wav');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [, fetchOptions] = mockFetch.mock.calls[0] as [string, RequestInit];

    // form.getHeaders() returns an object with a Content-Type multipart boundary header
    expect(fetchOptions.headers).toBeDefined();
    expect((fetchOptions.headers as Record<string, string>)['content-type']).toMatch(
      /^multipart\/form-data; boundary=/,
    );
  });
});
