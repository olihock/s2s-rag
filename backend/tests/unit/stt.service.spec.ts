import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';

// Load the compiled dist service directly — tsc compiles `import * as FormData`
// to `const FormData = require('form-data')` which correctly binds the constructor.
// The SWC/Vitest transpiler has a different interop behaviour, so we use dist.
const requireDist = createRequire(import.meta.url);

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('STT Service (US1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should transcribe audio using Faster-Whisper endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ text: 'Hello world', language: 'en' }),
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { SttService } = requireDist('../../dist/services/stt.service') as {
      SttService: new () => {
        transcribe: (buf: Buffer, mime: string) => Promise<{ text: string; language: string }>;
      };
    };
    const service = new SttService();
    const result = await service.transcribe(Buffer.from('mock-audio'), 'audio/wav');

    expect(result.text).toBe('Hello world');
    expect(result.language).toBe('en');
  });

  it('should handle German audio transcription', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ text: 'Hallo Welt', language: 'de' }),
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { SttService } = requireDist('../../dist/services/stt.service') as {
      SttService: new () => {
        transcribe: (buf: Buffer, mime: string) => Promise<{ text: string; language: string }>;
      };
    };
    const service = new SttService();
    const result = await service.transcribe(Buffer.from('mock-german-audio'), 'audio/wav');

    expect(result.language).toBe('de');
  });

  it('should throw on Whisper API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { SttService } = requireDist('../../dist/services/stt.service') as {
      SttService: new () => { transcribe: (buf: Buffer, mime: string) => Promise<unknown> };
    };
    const service = new SttService();

    await expect(service.transcribe(Buffer.from('mock-audio'), 'audio/wav')).rejects.toThrow(
      'Whisper STT failed',
    );
  });
});
