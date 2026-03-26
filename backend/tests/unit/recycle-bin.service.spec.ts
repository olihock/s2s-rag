import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RecycleBinService } from '../../src/services/recycle-bin.service';
import { PrismaService } from '../../src/db/prisma.service';
import { VectorService } from '../../src/vector/vector.service';

const mockPrisma = {
  recycleBin: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  document: {
    update: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
  },
  folder: {
    update: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
  },
};

const mockVector = {
  deleteByDocumentId: vi.fn(),
};

describe('RecycleBinService', () => {
  let service: RecycleBinService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RecycleBinService(
      mockPrisma as unknown as PrismaService,
      mockVector as unknown as VectorService,
    );
  });

  describe('moveToRecycleBin()', () => {
    it('should create a recycle bin record for a document', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        ownerId: 'user-1',
        filename: 'test.pdf',
      });
      mockPrisma.recycleBin.create.mockResolvedValue({
        id: 'rb-1',
        itemId: 'doc-1',
        itemType: 'document',
        userId: 'user-1',
        deletedAt: new Date(),
      });

      await service.moveToRecycleBin('user-1', 'document', 'doc-1', '/');
      expect(mockPrisma.recycleBin.create).toHaveBeenCalledOnce();
    });

    it('should create a recycle bin record for a folder', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue({
        id: 'f1',
        ownerId: 'user-1',
        name: 'Work',
      });
      mockPrisma.recycleBin.create.mockResolvedValue({
        id: 'rb-2',
        itemId: 'f1',
        itemType: 'folder',
        userId: 'user-1',
        deletedAt: new Date(),
      });

      await service.moveToRecycleBin('user-1', 'folder', 'f1', '/');
      expect(mockPrisma.recycleBin.create).toHaveBeenCalledOnce();
    });

    it('should throw if item does not belong to user', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        ownerId: 'other-user',
      });

      await expect(service.moveToRecycleBin('user-1', 'document', 'doc-1', '/')).rejects.toThrow();
    });
  });

  describe('restore()', () => {
    it('should restore a document from the recycle bin', async () => {
      mockPrisma.recycleBin.findUnique.mockResolvedValue({
        id: 'rb-1',
        itemId: 'doc-1',
        itemType: 'document',
        userId: 'user-1',
      });
      mockPrisma.document.update.mockResolvedValue({ id: 'doc-1', status: 'active' });
      mockPrisma.recycleBin.delete.mockResolvedValue({ id: 'rb-1' });

      await service.restore('user-1', 'rb-1');
      expect(mockPrisma.recycleBin.delete).toHaveBeenCalledOnce();
    });

    it('should throw if recycle bin item not found', async () => {
      mockPrisma.recycleBin.findUnique.mockResolvedValue(null);
      await expect(service.restore('user-1', 'nonexistent')).rejects.toThrow();
    });
  });

  describe('permanentDelete()', () => {
    it('should delete a document permanently and from Milvus', async () => {
      mockPrisma.recycleBin.findUnique.mockResolvedValue({
        id: 'rb-1',
        itemId: 'doc-1',
        itemType: 'document',
        userId: 'user-1',
      });
      mockPrisma.document.delete.mockResolvedValue({ id: 'doc-1' });
      mockPrisma.recycleBin.delete.mockResolvedValue({ id: 'rb-1' });
      mockVector.deleteByDocumentId.mockResolvedValue(undefined);

      await service.permanentDelete('user-1', 'rb-1');
      expect(mockVector.deleteByDocumentId).toHaveBeenCalledWith('doc-1');
      expect(mockPrisma.document.delete).toHaveBeenCalledOnce();
    });

    it('should succeed even when Milvus throws during permanent delete (best-effort)', async () => {
      mockPrisma.recycleBin.findUnique.mockResolvedValue({
        id: 'rb-1',
        itemId: 'doc-1',
        itemType: 'document',
        userId: 'user-1',
      });
      mockPrisma.document.delete.mockResolvedValue({ id: 'doc-1' });
      mockPrisma.recycleBin.delete.mockResolvedValue({ id: 'rb-1' });
      mockVector.deleteByDocumentId.mockRejectedValueOnce(new Error('Milvus unavailable'));

      await expect(service.permanentDelete('user-1', 'rb-1')).resolves.toBeUndefined();
    });

    it('should NOT call deleteByDocumentId when item type is folder', async () => {
      mockPrisma.recycleBin.findUnique.mockResolvedValue({
        id: 'rb-2',
        itemId: 'folder-1',
        itemType: 'folder',
        userId: 'user-1',
      });
      mockPrisma.folder.delete.mockResolvedValue({ id: 'folder-1' });
      mockPrisma.recycleBin.delete.mockResolvedValue({ id: 'rb-2' });

      await service.permanentDelete('user-1', 'rb-2');
      expect(mockVector.deleteByDocumentId).not.toHaveBeenCalled();
    });
  });

  describe('autoCleanup()', () => {
    it('should delete all entries older than 30 days', async () => {
      mockPrisma.recycleBin.findMany.mockResolvedValue([
        {
          id: 'rb-old-1',
          itemId: 'doc-old-1',
          itemType: 'document',
          userId: 'user-1',
          deletedAt: new Date('2020-01-01'),
        },
      ]);
      mockPrisma.recycleBin.findUnique.mockResolvedValue({
        id: 'rb-old-1',
        itemId: 'doc-old-1',
        itemType: 'document',
        userId: 'user-1',
        deletedAt: new Date('2020-01-01'),
      });
      mockPrisma.document.delete.mockResolvedValue({ id: 'doc-old-1' });
      mockPrisma.recycleBin.delete.mockResolvedValue({ id: 'rb-old-1' });
      mockVector.deleteByDocumentId.mockResolvedValue(undefined);

      await service.autoCleanup();
      expect(mockPrisma.recycleBin.findMany).toHaveBeenCalledOnce();
    });

    it('should not delete entries newer than 30 days', async () => {
      mockPrisma.recycleBin.findMany.mockResolvedValue([]);

      await service.autoCleanup();
      expect(mockPrisma.document.delete).not.toHaveBeenCalled();
    });
  });

  describe('listItems()', () => {
    it('should return all recycle bin items for user', async () => {
      mockPrisma.recycleBin.findMany.mockResolvedValue([
        {
          id: 'rb-1',
          itemId: 'doc-1',
          itemType: 'DOCUMENT',
          userId: 'user-1',
          deletedAt: new Date(),
        },
      ]);

      const items = await service.listItems('user-1');
      expect(items).toHaveLength(1);
    });
  });
});
