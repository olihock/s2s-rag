import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import FormData from 'form-data';

export interface TranscriptionResult {
  text: string;
  language: string;
}

@Injectable()
export class SttService {
  private readonly logger = new Logger(SttService.name);
  private readonly whisperUrl: string;

  constructor() {
    this.whisperUrl = process.env.WHISPER_URL ?? 'http://localhost:9000';
  }

  async transcribe(audioBuffer: Buffer, mimeType: string): Promise<TranscriptionResult> {
    const form = new FormData();
    form.append('file', audioBuffer, {
      filename: 'audio.wav',
      contentType: mimeType,
    });
    form.append('response_format', 'json');

    const response = await fetch(`${this.whisperUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      body: form as unknown as BodyInit,
      headers: form.getHeaders(),
    });

    if (!response.ok) {
      this.logger.error(`Whisper STT failed: ${response.status} ${response.statusText}`);
      throw new ServiceUnavailableException('Whisper STT failed');
    }

    const data = (await response.json()) as { text: string; language?: string };
    return {
      text: data.text,
      language: data.language ?? 'en',
    };
  }
}
