import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Answer Component (US1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the answer text', async () => {
    const { Answer } = await import('../../src/components/Answer');

    render(
      <Answer
        result={{
          transcription: 'What is this?',
          answer: 'This is a test answer.',
          sources: [
            {
              documentId: 'doc-1',
              filename: 'test.pdf',
              chunkText: 'source text',
              similarity: 0.95,
            },
          ],
          language: 'en',
        }}
      />,
    );

    expect(screen.getByText('This is a test answer.')).toBeInTheDocument();
    expect(screen.getByText(/test\.pdf/i)).toBeInTheDocument();
  });

  it('should show play button for audio', async () => {
    const { Answer } = await import('../../src/components/Answer');

    render(
      <Answer
        result={{
          transcription: 'Question?',
          answer: 'Answer.',
          audioUrl: 'blob:audio',
          sources: [],
          language: 'en',
        }}
      />,
    );

    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
  });
});
