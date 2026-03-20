import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { SupportedLanguage } from '../types';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly ollamaUrl: string;
  private readonly model: string;

  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL ?? 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL ?? 'llama3';
  }

  async generateAnswer(
    question: string,
    contextChunks: string[],
    language: SupportedLanguage,
  ): Promise<string> {
    const contextText = contextChunks
      .map((chunk, i) => `[${i + 1}] ${chunk}`)
      .join('\n\n');

    const langInstruction =
      language === 'de'
        ? 'Antworte auf Deutsch.'
        : 'Please respond in English.';

    const prompt = `You are a helpful assistant that answers questions based on provided document context.
${langInstruction}
If the answer cannot be found in the context, say so clearly.

Context:
${contextText}

Question: ${question}

Answer:`;

    const response = await fetch(`${this.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      this.logger.error(`LLM generation failed: ${response.status} ${response.statusText}`);
      throw new ServiceUnavailableException('LLM generation failed');
    }

    const data = (await response.json()) as { response: string };
    return data.response.trim();
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${this.ollamaUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: text,
      }),
    });

    if (!response.ok) {
      this.logger.error(`Embedding generation failed: ${response.status}`);
      // Return dummy embedding on failure for graceful degradation
      return Array.from({ length: 768 }, () => 0);
    }

    const data = (await response.json()) as { embedding: number[] };
    return data.embedding;
  }
}
