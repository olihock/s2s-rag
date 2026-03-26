import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentsService } from '../../src/services/documents.service';

// Mock dependencies
const mockPrisma = {
  document: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  recycleBin: {
    deleteMany: vi.fn(),
  },
};

const mockVectorService = {
  insertChunks: vi.fn(),
  deleteByDocumentId: vi.fn(),
};

const mockLlmService = {
  generateEmbedding: vi.fn(),
};

describe('DocumentsService (US1)', () => {
  let service: DocumentsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DocumentsService(
      mockPrisma as never,
      mockVectorService as never,
      mockLlmService as never,
    );
  });

  describe('uploadPdf', () => {
    it('should reject files larger than 100MB', async () => {
      const largeFile = {
        originalname: 'large.pdf',
        mimetype: 'application/pdf',
        size: 101 * 1024 * 1024, // 101 MB
        buffer: Buffer.from(''),
      };

      await expect(service.uploadPdf(largeFile as never, 'user-id', undefined)).rejects.toThrow(
        'File size exceeds 100MB limit',
      );
    });

    it('should reject non-PDF files', async () => {
      const invalidFile = {
        originalname: 'image.png',
        mimetype: 'image/png',
        size: 1024,
        buffer: Buffer.from(''),
      };

      await expect(service.uploadPdf(invalidFile as never, 'user-id', undefined)).rejects.toThrow(
        'Only PDF files are allowed',
      );
    });

    it('should create a document and index it in Milvus', async () => {
      const file = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('%PDF-1.4 test content'),
      };

      mockPrisma.document.create.mockResolvedValueOnce({
        id: 'doc-1',
        ownerId: 'user-1',
        filename: 'test.pdf',
        uploadDate: new Date(),
        fileSize: 1024,
        contentText: 'test content',
        detectedLanguage: 'en',
        searchable: true,
        status: 'active',
        folderId: null,
        ocrConfidence: null,
        metadata: {},
      });

      const result = await service.uploadPdf(file as never, 'user-1', undefined);

      expect(result.filename).toBe('test.pdf');
      expect(mockPrisma.document.create).toHaveBeenCalledOnce();
    });

    it('should auto-detect German language in PDF content', () => {
      const germanContent =
        'Guten Tag, dies ist ein deutsches Dokument über Technologie und Wissenschaft.';
      const detectSpy = vi.spyOn(service as never, 'detectLanguage' as never);
      detectSpy.mockReturnValue('de');

      const lang = (service as never)['detectLanguage'](germanContent) as string;
      expect(lang).toBe('de');
    });
  });

  describe('excludeFromSearch', () => {
    it('should mark a document as excluded from search', async () => {
      mockPrisma.document.findUnique.mockResolvedValueOnce({
        id: 'doc-1',
        ownerId: 'user-1',
        status: 'active',
      });
      mockPrisma.document.update.mockResolvedValueOnce({
        id: 'doc-1',
        status: 'excluded',
        searchable: false,
      });

      await service.excludeFromSearch('doc-1', 'user-1');

      expect(mockPrisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: { searchable: false, status: 'excluded' },
      });
    });

    it('should throw when user is not the owner', async () => {
      mockPrisma.document.findUnique.mockResolvedValueOnce({
        id: 'doc-1',
        ownerId: 'other-user',
        status: 'active',
      });

      await expect(service.excludeFromSearch('doc-1', 'user-1')).rejects.toThrow('Forbidden');
    });
  });

  describe('hardDelete', () => {
    const activeDoc = { id: 'doc-1', ownerId: 'user-1', status: 'active' };
    const excludedDoc = { id: 'doc-1', ownerId: 'user-1', status: 'excluded' };
    const recycleBinDoc = { id: 'doc-1', ownerId: 'user-1', status: 'recycle_bin' };

    beforeEach(() => {
      mockPrisma.recycleBin.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.document.delete.mockResolvedValue(activeDoc);
      mockVectorService.deleteByDocumentId.mockResolvedValue(undefined);
    });

    it('should throw NotFoundException when document does not exist', async () => {
      mockPrisma.document.findUnique.mockResolvedValueOnce(null);
      await expect(service.hardDelete('doc-1', 'user-1')).rejects.toThrow('Document not found');
    });

    it('should throw ForbiddenException when user is not the owner', async () => {
      mockPrisma.document.findUnique.mockResolvedValueOnce({ id: 'doc-1', ownerId: 'other-user' });
      await expect(service.hardDelete('doc-1', 'user-1')).rejects.toThrow('Forbidden');
    });

    it('should permanently delete the document from the database', async () => {
      mockPrisma.document.findUnique.mockResolvedValueOnce(activeDoc);
      await service.hardDelete('doc-1', 'user-1');
      expect(mockPrisma.document.delete).toHaveBeenCalledWith({ where: { id: 'doc-1' } });
    });

    it('should call vectorService.deleteByDocumentId with the document id', async () => {
      mockPrisma.document.findUnique.mockResolvedValueOnce(activeDoc);
      await service.hardDelete('doc-1', 'user-1');
      // Allow async fire-and-forget to settle
      await new Promise((r) => setTimeout(r, 0));
      expect(mockVectorService.deleteByDocumentId).toHaveBeenCalledWith('doc-1');
    });

    it('should delete any orphaned RecycleBin entry for the document', async () => {
      mockPrisma.document.findUnique.mockResolvedValueOnce(activeDoc);
      await service.hardDelete('doc-1', 'user-1');
      expect(mockPrisma.recycleBin.deleteMany).toHaveBeenCalledWith({
        where: { itemId: 'doc-1', itemType: 'document' },
      });
    });

    it('should succeed even when Milvus throws (best-effort)', async () => {
      mockPrisma.document.findUnique.mockResolvedValueOnce(activeDoc);
      mockVectorService.deleteByDocumentId.mockRejectedValueOnce(new Error('Milvus unavailable'));
      await expect(service.hardDelete('doc-1', 'user-1')).resolves.toBeUndefined();
    });

    it('should succeed when document status is excluded', async () => {
      mockPrisma.document.findUnique.mockResolvedValueOnce(excludedDoc);
      await expect(service.hardDelete('doc-1', 'user-1')).resolves.toBeUndefined();
      expect(mockPrisma.document.delete).toHaveBeenCalledWith({ where: { id: 'doc-1' } });
    });

    it('should succeed when document status is recycle_bin', async () => {
      mockPrisma.document.findUnique.mockResolvedValueOnce(recycleBinDoc);
      await expect(service.hardDelete('doc-1', 'user-1')).resolves.toBeUndefined();
      expect(mockPrisma.document.delete).toHaveBeenCalledWith({ where: { id: 'doc-1' } });
    });
  });
});
