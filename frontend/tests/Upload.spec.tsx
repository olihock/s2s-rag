import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the API service
vi.mock('../../src/services/api', () => ({
  uploadDocument: vi.fn(),
}));

import { Upload } from '../../src/components/Upload';
import { uploadDocument } from '../../src/services/api';

describe('Upload Component (US1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the upload zone', () => {
    render(<Upload onSuccess={vi.fn()} />);
    expect(screen.getByText(/upload.*pdf/i)).toBeInTheDocument();
  });

  it('should accept PDF files', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    (uploadDocument as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'doc-1',
      filename: 'test.pdf',
    });

    render(<Upload onSuccess={onSuccess} />);

    const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByTestId('file-input');
    await user.upload(input, file);

    await waitFor(() => {
      expect(uploadDocument).toHaveBeenCalled();
    });
  });

  it('should display error for non-PDF files', async () => {
    const user = userEvent.setup();

    render(<Upload onSuccess={vi.fn()} />);

    const file = new File(['content'], 'notapdf.exe', { type: 'application/octet-stream' });
    const input = screen.getByTestId('file-input');
    await user.upload(input, file);

    expect(screen.getByText(/only pdf files/i)).toBeInTheDocument();
  });

  it('should show upload progress', async () => {
    const user = userEvent.setup();
    let resolveUpload!: (v: unknown) => void;
    (uploadDocument as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () => new Promise((resolve) => { resolveUpload = resolve; }),
    );

    render(<Upload onSuccess={vi.fn()} />);

    const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByTestId('file-input');
    await user.upload(input, file);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    resolveUpload({ id: 'doc-1', filename: 'test.pdf' });
  });
});
