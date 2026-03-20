import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

// Mock the STT service
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('STT Service (US1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should transcribe audio using Faster-Whisper endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: 'Hello world', language: 'en' }),
    });

    const { SttService } = await import('../../src/services/stt.service');
    const service = new SttService();
    const result = await service.transcribe(Buffer.from('mock-audio'), 'audio/wav');

    expect(result.text).toBe('Hello world');
    expect(result.language).toBe('en');
  });

  it('should handle German audio transcription', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: 'Hallo Welt', language: 'de' }),
    });

    const { SttService } = await import('../../src/services/stt.service');
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

    const { SttService } = await import('../../src/services/stt.service');
    const service = new SttService();

    await expect(
      service.transcribe(Buffer.from('mock-audio'), 'audio/wav'),
    ).rejects.toThrow('Whisper STT failed');
  });
});
