import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ShareFolder } from '../../src/components/ShareFolder';
import * as api from '../../src/services/api';

vi.mock('../../src/services/api', () => ({
  shareFolder: vi.fn(),
}));

describe('ShareFolder', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render share modal with email input', () => {
    render(<ShareFolder folderId="folder-1" folderName="Work" onClose={mockOnClose} />);
    expect(screen.getByText(/share.*work/i)).toBeTruthy();
    expect(screen.getByPlaceholderText(/email/i)).toBeTruthy();
  });

  it('should call shareFolder API on submit', async () => {
    vi.mocked(api.shareFolder).mockResolvedValue(undefined);
    render(<ShareFolder folderId="folder-1" folderName="Work" onClose={mockOnClose} />);

    const input = screen.getByPlaceholderText(/email/i);
    fireEvent.change(input, { target: { value: 'bob@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /share/i }));

    await waitFor(() => {
      expect(api.shareFolder).toHaveBeenCalledWith('folder-1', 'bob@example.com');
      expect(mockOnClose).toHaveBeenCalledOnce();
    });
  });

  it('should display error when recipient email does not exist', async () => {
    vi.mocked(api.shareFolder).mockRejectedValue(new Error('User not found'));
    render(<ShareFolder folderId="folder-1" folderName="Work" onClose={mockOnClose} />);

    const input = screen.getByPlaceholderText(/email/i);
    fireEvent.change(input, { target: { value: 'unknown@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /share/i }));

    await waitFor(() => {
      expect(screen.getByText(/not found|error/i)).toBeTruthy();
    });
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should call onClose when cancel is clicked', () => {
    render(<ShareFolder folderId="folder-1" folderName="Work" onClose={mockOnClose} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockOnClose).toHaveBeenCalledOnce();
  });
});
