import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

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
    const arrayBuffer = audioBuffer.buffer.slice(
      audioBuffer.byteOffset,
      audioBuffer.byteOffset + audioBuffer.byteLength,
    ) as ArrayBuffer;
    form.append('file', new Blob([arrayBuffer], { type: mimeType }), 'audio.wav');
    form.append('response_format', 'json');

    const response = await fetch(`${this.whisperUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      body: form,
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
