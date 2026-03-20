import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { SupportedLanguage } from '../types';

const VOICE_BY_LANGUAGE: Record<SupportedLanguage, string> = {
  en: 'en_US-lessac-medium',
  de: 'de_DE-thorsten-medium',
};

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);
  private readonly ttsUrl: string;

  constructor() {
    this.ttsUrl = process.env.TTS_URL ?? 'http://localhost:10200';
  }

  async synthesize(text: string, language: SupportedLanguage): Promise<Buffer> {
    const voice = VOICE_BY_LANGUAGE[language];

    const response = await fetch(`${this.ttsUrl}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
    });

    if (!response.ok) {
      this.logger.error(`TTS synthesis failed: ${response.status}`);
      throw new ServiceUnavailableException('TTS synthesis failed');
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
