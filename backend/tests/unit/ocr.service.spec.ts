import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OcrService } from '../../src/services/ocr.service';
import { PrismaService } from '../../src/db/prisma.service';
import { VectorService } from '../../src/vector/vector.service';
import { DocumentsService } from '../../src/services/documents.service';

const mockPrisma = {
  document: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
};

const mockVector = {
  insertChunks: vi.fn(),
};

const mockDocumentsService = {
  detectLanguage: vi.fn(),
};

describe('OcrService', () => {
  let service: OcrService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OcrService(
      mockPrisma as unknown as PrismaService,
      mockVector as unknown as VectorService,
      mockDocumentsService as unknown as DocumentsService,
    );
  });

  describe('processImage()', () => {
    it('should reject non-JPEG/PNG files', async () => {
      const buffer = Buffer.from('fake-data');
      await expect(
        service.processImage(buffer, 'application/pdf', 'user-1', 'fake.pdf'),
      ).rejects.toThrow();
    });

    it('should reject files over 25 MB', async () => {
      const largeBuffer = Buffer.alloc(26 * 1024 * 1024);
      await expect(
        service.processImage(largeBuffer, 'image/jpeg', 'user-1', 'large.jpg'),
      ).rejects.toThrow();
    });

    it('should accept JPEG files under size limit', async () => {
      const buffer = Buffer.from('fake-jpeg');
      vi.spyOn(service as any, 'callOcrApi').mockResolvedValue({
        text: 'Extracted text from image',
        language: 'en',
      });
      mockDocumentsService.detectLanguage.mockReturnValue('en');
      mockPrisma.document.create.mockResolvedValue({
        id: 'doc-1',
        filename: 'photo.jpg',
        detectedLanguage: 'en',
        status: 'active',
        ownerId: 'user-1',
        fileSize: buffer.length,
        pageCount: 1,
        folderId: null,
        uploadedAt: new Date(),
        updatedAt: new Date(),
      });
      mockVector.insertChunks.mockResolvedValue(undefined);

      const result = await service.processImage(buffer, 'image/jpeg', 'user-1', 'photo.jpg');
      expect(result).toHaveProperty('id');
      expect(result.detectedLanguage).toBe('en');
    });

    it('should accept PNG files under size limit', async () => {
      const buffer = Buffer.from('fake-png');
      vi.spyOn(service as any, 'callOcrApi').mockResolvedValue({
        text: 'Extrahierter Text',
        language: 'de',
      });
      mockDocumentsService.detectLanguage.mockReturnValue('de');
      mockPrisma.document.create.mockResolvedValue({
        id: 'doc-2',
        filename: 'photo.png',
        detectedLanguage: 'de',
        status: 'active',
        ownerId: 'user-1',
        fileSize: buffer.length,
        pageCount: 1,
        folderId: null,
        uploadedAt: new Date(),
        updatedAt: new Date(),
      });
      mockVector.insertChunks.mockResolvedValue(undefined);

      const result = await service.processImage(buffer, 'image/png', 'user-1', 'photo.png');
      expect(result.detectedLanguage).toBe('de');
    });

    it('should detect German language in OCR output', async () => {
      const buffer = Buffer.from('fake-png');
      vi.spyOn(service as any, 'callOcrApi').mockResolvedValue({
        text: 'Die Katze sitzt auf der Matte und schaut aus dem Fenster',
        language: 'de',
      });
      mockDocumentsService.detectLanguage.mockReturnValue('de');
      mockPrisma.document.create.mockResolvedValue({
        id: 'doc-3',
        filename: 'german.png',
        detectedLanguage: 'de',
        status: 'active',
        ownerId: 'user-1',
        fileSize: buffer.length,
        pageCount: 1,
        folderId: null,
        uploadedAt: new Date(),
        updatedAt: new Date(),
      });
      mockVector.insertChunks.mockResolvedValue(undefined);

      const result = await service.processImage(buffer, 'image/png', 'user-1', 'german.png');
      expect(result.detectedLanguage).toBe('de');
    });

    it('should store OCR text as a document in Postgres', async () => {
      const buffer = Buffer.from('fake-jpeg');
      vi.spyOn(service as any, 'callOcrApi').mockResolvedValue({
        text: 'Hello world OCR content',
        language: 'en',
      });
      mockDocumentsService.detectLanguage.mockReturnValue('en');
      const createdDoc = {
        id: 'doc-4',
        filename: 'scan.jpg',
        detectedLanguage: 'en',
        status: 'active',
        ownerId: 'user-1',
        fileSize: buffer.length,
        pageCount: 1,
        folderId: null,
        uploadedAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.document.create.mockResolvedValue(createdDoc);
      mockVector.insertChunks.mockResolvedValue(undefined);

      await service.processImage(buffer, 'image/jpeg', 'user-1', 'scan.jpg');
      expect(mockPrisma.document.create).toHaveBeenCalledOnce();
      expect(mockVector.insertChunks).toHaveBeenCalledOnce();
    });
  });
});
