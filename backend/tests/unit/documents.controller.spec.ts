import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentsController } from '../../src/controllers/documents.controller';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

const mockDocumentsService = {
  hardDelete: vi.fn(),
};

const mockUser = { id: 'user-1', email: 'test@example.com' };

// Minimal stubs for other injected services (not under test here)
const mockSttService = {};
const mockLlmService = {};
const mockTtsService = {};
const mockVectorService = {};

describe('DocumentsController — DELETE /documents/:id', () => {
  let controller: DocumentsController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new DocumentsController(
      mockDocumentsService as never,
      mockSttService as never,
      mockLlmService as never,
      mockTtsService as never,
      mockVectorService as never,
    );
  });

  it('should call documentsService.hardDelete with document id and user id', async () => {
    mockDocumentsService.hardDelete.mockResolvedValueOnce(undefined);
    await controller.deleteDocument('doc-1', mockUser as never);
    expect(mockDocumentsService.hardDelete).toHaveBeenCalledWith('doc-1', 'user-1');
  });

  it('should return nothing (HTTP 204) on successful deletion', async () => {
    mockDocumentsService.hardDelete.mockResolvedValueOnce(undefined);
    const result = await controller.deleteDocument('doc-1', mockUser as never);
    expect(result).toBeUndefined();
  });

  it('should propagate NotFoundException (404) when document does not exist', async () => {
    mockDocumentsService.hardDelete.mockRejectedValueOnce(
      new NotFoundException('Document not found'),
    );
    await expect(controller.deleteDocument('nonexistent', mockUser as never)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should propagate ForbiddenException (403) when user is not the owner', async () => {
    mockDocumentsService.hardDelete.mockRejectedValueOnce(new ForbiddenException());
    await expect(controller.deleteDocument('doc-1', mockUser as never)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
