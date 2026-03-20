import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { OCRUpload } from '../../src/components/OCRUpload';
import * as api from '../../src/services/api';

vi.mock('../../src/services/api', () => ({
  uploadOcrDocument: vi.fn(),
}));

describe('OCRUpload', () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the upload area', () => {
    render(<OCRUpload onSuccess={mockOnSuccess} />);
    expect(screen.getByText(/scan photo/i)).toBeTruthy();
  });

  it('should reject non-image files', async () => {
    render(<OCRUpload onSuccess={mockOnSuccess} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText(/jpeg.*png/i)).toBeTruthy();
    });
    expect(api.uploadOcrDocument).not.toHaveBeenCalled();
  });

  it('should reject images over 25 MB', async () => {
    render(<OCRUpload onSuccess={mockOnSuccess} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const largeBlob = new Blob([new ArrayBuffer(26 * 1024 * 1024)], { type: 'image/jpeg' });
    const file = new File([largeBlob], 'large.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText(/25 mb/i)).toBeTruthy();
    });
  });

  it('should call uploadOcrDocument on valid image', async () => {
    vi.mocked(api.uploadOcrDocument).mockResolvedValue({
      id: 'doc-1',
      filename: 'photo.jpg',
      detectedLanguage: 'en',
      status: 'active',
      ownerId: 'user-1',
      fileSize: 1024,
      pageCount: 1,
      folderId: null,
      uploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any);

    render(<OCRUpload onSuccess={mockOnSuccess} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake-data'], 'photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);

    await waitFor(() => {
      expect(api.uploadOcrDocument).toHaveBeenCalledWith(file, undefined);
      expect(mockOnSuccess).toHaveBeenCalledOnce();
    });
  });
});
