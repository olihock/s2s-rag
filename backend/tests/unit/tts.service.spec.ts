import { describe, it, expect, vi, beforeEach } from 'vitest';

global.fetch = vi.fn();
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('TTS Service (US1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should synthesize speech from text in English', async () => {
    const audioBuffer = Buffer.from('mock-audio-data');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => audioBuffer.buffer,
    });

    const { TtsService } = await import('../../src/services/tts.service');
    const service = new TtsService();
    const result = await service.synthesize('Hello world', 'en');

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should synthesize speech in German', async () => {
    const audioBuffer = Buffer.from('mock-german-audio');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => audioBuffer.buffer,
    });

    const { TtsService } = await import('../../src/services/tts.service');
    const service = new TtsService();
    const result = await service.synthesize('Hallo Welt', 'de');

    expect(result).toBeInstanceOf(Buffer);
  });

  it('should throw on TTS API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { TtsService } = await import('../../src/services/tts.service');
    const service = new TtsService();

    await expect(service.synthesize('test', 'en')).rejects.toThrow('TTS synthesis failed');
  });
});
