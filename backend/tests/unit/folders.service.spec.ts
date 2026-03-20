import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FoldersService } from '../../src/services/folders.service';
import { PrismaService } from '../../src/db/prisma.service';

const mockPrisma = {
  folder: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  folderShare: {
    create: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
};

describe('FoldersService', () => {
  let service: FoldersService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FoldersService(mockPrisma as unknown as PrismaService);
  });

  describe('create()', () => {
    it('should create a folder with name and owner', async () => {
      const folder = {
        id: 'folder-1', name: 'MyDocs', ownerId: 'user-1',
        parentFolderId: null, createdAt: new Date(), updatedAt: new Date(),
      };
      mockPrisma.folder.create.mockResolvedValue(folder);

      const result = await service.create('user-1', 'MyDocs');
      expect(result.name).toBe('MyDocs');
      expect(mockPrisma.folder.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'MyDocs', ownerId: 'user-1' }) }),
      );
    });

    it('should support nested folders via parentFolderId', async () => {
      const folder = {
        id: 'folder-2', name: 'SubFolder', ownerId: 'user-1',
        parentFolderId: 'folder-1', createdAt: new Date(), updatedAt: new Date(),
      };
      mockPrisma.folder.create.mockResolvedValue(folder);

      const result = await service.create('user-1', 'SubFolder', 'folder-1');
      expect(result.parentFolderId).toBe('folder-1');
    });
  });

  describe('listByUser()', () => {
    it('should return all folders owned by user', async () => {
      const folders = [
        { id: 'f1', name: 'Work', ownerId: 'user-1', parentFolderId: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 'f2', name: 'Personal', ownerId: 'user-1', parentFolderId: null, createdAt: new Date(), updatedAt: new Date() },
      ];
      mockPrisma.folder.findMany.mockResolvedValue(folders);

      const result = await service.listByUser('user-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('rename()', () => {
    it('should rename the folder', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue({
        id: 'f1', name: 'Old', ownerId: 'user-1', parentFolderId: null,
      });
      mockPrisma.folder.update.mockResolvedValue({
        id: 'f1', name: 'New', ownerId: 'user-1', parentFolderId: null,
      });

      const result = await service.rename('user-1', 'f1', 'New');
      expect(result.name).toBe('New');
    });

    it('should throw if folder not found', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue(null);
      await expect(service.rename('user-1', 'non-existent', 'Name')).rejects.toThrow();
    });
  });

  describe('delete()', () => {
    it('should delete the folder', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue({ id: 'f1', ownerId: 'user-1' });
      mockPrisma.folder.delete.mockResolvedValue({ id: 'f1' });

      await service.delete('user-1', 'f1');
      expect(mockPrisma.folder.delete).toHaveBeenCalledOnce();
    });
  });

  describe('shareFolder()', () => {
    it('should create a share record when recipient email exists', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue({ id: 'f1', ownerId: 'user-1' });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-2', email: 'bob@example.com' });
      mockPrisma.folderShare.create.mockResolvedValue({
        id: 'share-1', folderId: 'f1', recipientUserId: 'user-2', permission: 'READ',
      });

      const result = await service.shareFolder('user-1', 'f1', 'bob@example.com');
      expect(result).toHaveProperty('id');
      expect(mockPrisma.folderShare.create).toHaveBeenCalledOnce();
    });

    it('should throw 404 when recipient email does not exist', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue({ id: 'f1', ownerId: 'user-1' });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.shareFolder('user-1', 'f1', 'nobody@example.com')).rejects.toThrow();
    });

    it('should throw if caller is not folder owner', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue({ id: 'f1', ownerId: 'other-user' });

      await expect(service.shareFolder('user-1', 'f1', 'bob@example.com')).rejects.toThrow();
    });
  });

  describe('revokeShare()', () => {
    it('should delete the share record', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue({ id: 'f1', ownerId: 'user-1' });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-2', email: 'bob@example.com' });
      mockPrisma.folderShare.delete.mockResolvedValue({ id: 'share-1' });

      await service.revokeShare('user-1', 'f1', 'bob@example.com');
      expect(mockPrisma.folderShare.delete).toHaveBeenCalledOnce();
    });
  });
});
