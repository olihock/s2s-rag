import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../src/services/api', () => ({
  queryWithVoice: vi.fn(),
}));

import { VoiceInput } from '../../src/components/VoiceInput';
import { queryWithVoice } from '../../src/services/api';

describe('VoiceInput Component (US1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render push-to-talk button', () => {
    render(<VoiceInput documentIds={['doc-1']} onResult={vi.fn()} />);
    expect(screen.getByRole('button', { name: /hold to speak/i })).toBeInTheDocument();
  });

  it('should show recording state while button is held', async () => {
    render(<VoiceInput documentIds={['doc-1']} onResult={vi.fn()} />);

    const button = screen.getByRole('button', { name: /hold to speak/i });
    fireEvent.mouseDown(button);

    expect(screen.getByText(/recording/i)).toBeInTheDocument();

    fireEvent.mouseUp(button);
  });

  it('should call onResult with transcription and answer after recording', async () => {
    const onResult = vi.fn();
    (queryWithVoice as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      transcription: 'What is this document about?',
      answer: 'This document is about testing.',
      sources: [],
      language: 'en',
    });

    render(<VoiceInput documentIds={['doc-1']} onResult={onResult} />);

    const button = screen.getByRole('button', { name: /hold to speak/i });
    fireEvent.mouseDown(button);
    fireEvent.mouseUp(button);

    await waitFor(() => {
      expect(onResult).toHaveBeenCalledWith(
        expect.objectContaining({
          transcription: 'What is this document about?',
          answer: 'This document is about testing.',
        }),
      );
    });
  });
});
