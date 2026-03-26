import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock the entire api service
vi.mock('../../src/services/api', () => ({
  listDocuments: vi.fn().mockResolvedValue([]),
  listFolders: vi.fn().mockResolvedValue([]),
  listRecycleBin: vi.fn().mockResolvedValue([]),
  deleteDocument: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  createFolder: vi.fn(),
  deleteFolder: vi.fn(),
  excludeDocument: vi.fn(),
  reEnableDocument: vi.fn(),
  queryWithVoice: vi.fn(),
  queryWithChat: vi.fn(),
  updateLanguagePreference: vi.fn(),
}));

import App from '../../src/App';
import * as api from '../../src/services/api';

const mockDeleteDocument = api.deleteDocument as ReturnType<typeof vi.fn>;
const mockListDocuments = api.listDocuments as ReturnType<typeof vi.fn>;

const mockDocument = {
  id: 'doc-1',
  filename: 'test.pdf',
  fileSize: 1024,
  detectedLanguage: 'en',
  status: 'active',
  searchable: true,
  folderId: null,
  uploadDate: new Date().toISOString(),
};

describe('Documents tab — Delete Document (US1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Simulate logged-in state
    localStorage.setItem('accessToken', 'fake-token');
    mockListDocuments.mockResolvedValue([mockDocument]);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should render a delete button for each document (hidden by default via opacity-0)', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole('button', { name: /delete test\.pdf/i });
    expect(deleteBtn).toBeInTheDocument();
    expect(deleteBtn.className).toMatch(/opacity-0/);
  });

  it('should call deleteDocument API when user confirms deletion', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    mockDeleteDocument.mockResolvedValueOnce(undefined);

    render(<App />);

    await waitFor(() => screen.getByText('test.pdf'));

    fireEvent.click(screen.getByRole('button', { name: /delete test\.pdf/i }));

    await waitFor(() => {
      expect(mockDeleteDocument).toHaveBeenCalledWith('doc-1');
    });
  });

  it('should remove the document from the list after successful deletion', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    mockDeleteDocument.mockResolvedValueOnce(undefined);

    render(<App />);

    await waitFor(() => screen.getByText('test.pdf'));

    fireEvent.click(screen.getByRole('button', { name: /delete test\.pdf/i }));

    await waitFor(() => {
      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
    });
  });

  it('should NOT call deleteDocument when user cancels the confirmation dialog', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);

    render(<App />);

    await waitFor(() => screen.getByText('test.pdf'));

    fireEvent.click(screen.getByRole('button', { name: /delete test\.pdf/i }));

    await waitFor(() => {
      expect(mockDeleteDocument).not.toHaveBeenCalled();
    });
    // Document should still be visible
    expect(screen.getByText('test.pdf')).toBeInTheDocument();
  });

  it('should show an inline error message when deleteDocument API fails', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    mockDeleteDocument.mockRejectedValueOnce(new Error('Server error'));

    render(<App />);

    await waitFor(() => screen.getByText('test.pdf'));

    fireEvent.click(screen.getByRole('button', { name: /delete test\.pdf/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    // Document should still be in the list
    expect(screen.getByText('test.pdf')).toBeInTheDocument();
  });

  it('should keep the document in the list when deletion fails', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    mockDeleteDocument.mockRejectedValueOnce(new Error('Network error'));

    render(<App />);

    await waitFor(() => screen.getByText('test.pdf'));

    fireEvent.click(screen.getByRole('button', { name: /delete test\.pdf/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByText('test.pdf')).toBeInTheDocument();
  });
});
