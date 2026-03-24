import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { RecycleBinItem, RecycleBinItemType } from '../types';
import { RecycleBin } from '@prisma/client';

const RETENTION_DAYS = 30;

@Injectable()
export class RecycleBinService {
  private readonly logger = new Logger(RecycleBinService.name);

  constructor(private readonly prisma: PrismaService) {}

  async moveToRecycleBin(
    userId: string,
    itemType: RecycleBinItemType,
    itemId: string,
    originalLocation: string,
  ): Promise<void> {
    // Verify ownership
    if (itemType === 'document') {
      const doc = await this.prisma.document.findUnique({ where: { id: itemId } });
      if (!doc) throw new NotFoundException('Document not found');
      if (doc.ownerId !== userId) throw new ForbiddenException();

      await this.prisma.document.update({
        where: { id: itemId },
        data: { status: 'recycle_bin', searchable: false },
      });
    } else {
      const folder = await this.prisma.folder.findUnique({ where: { id: itemId } });
      if (!folder) throw new NotFoundException('Folder not found');
      if (folder.ownerId !== userId) throw new ForbiddenException();
    }

    await this.prisma.recycleBin.create({
      data: {
        userId,
        itemType,
        itemId,
        originalLocation,
      },
    });
  }

  async restore(userId: string, recycleBinItemId: string): Promise<void> {
    const item = await this.prisma.recycleBin.findUnique({ where: { id: recycleBinItemId } });
    if (!item) throw new NotFoundException('Recycle bin item not found');
    if (item.userId !== userId) throw new ForbiddenException();

    if (item.itemType === 'document') {
      await this.prisma.document.update({
        where: { id: item.itemId },
        data: { status: 'active', searchable: true },
      });
    }

    await this.prisma.recycleBin.delete({ where: { id: recycleBinItemId } });
  }

  async permanentDelete(userId: string, recycleBinItemId: string): Promise<void> {
    const item = await this.prisma.recycleBin.findUnique({ where: { id: recycleBinItemId } });
    if (!item) throw new NotFoundException('Recycle bin item not found');
    if (item.userId !== userId) throw new ForbiddenException();

    if (item.itemType === 'document') {
      await this.prisma.document.delete({ where: { id: item.itemId } }).catch(() => {
        this.logger.warn(`Document ${item.itemId} already deleted`);
      });
    } else {
      await this.prisma.folder.delete({ where: { id: item.itemId } }).catch(() => {
        this.logger.warn(`Folder ${item.itemId} already deleted`);
      });
    }

    await this.prisma.recycleBin.delete({ where: { id: recycleBinItemId } });
  }

  async listItems(userId: string): Promise<RecycleBinItem[]> {
    const items = await this.prisma.recycleBin.findMany({ where: { userId } });
    return items.map((i: RecycleBin) => ({
      id: i.id,
      userId: i.userId,
      itemType: i.itemType.toLowerCase() as RecycleBinItemType,
      itemId: i.itemId,
      deletedAt: i.deletedAt,
      originalLocation: i.originalLocation,
    }));
  }

  async autoCleanup(): Promise<number> {
    const cutoffDate = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const expiredItems = await this.prisma.recycleBin.findMany({
      where: { deletedAt: { lt: cutoffDate } },
    });

    let deleted = 0;
    for (const item of expiredItems) {
      try {
        await this.permanentDelete(item.userId, item.id);
        deleted++;
      } catch {
        this.logger.error(`Failed to auto-delete recycle bin item ${item.id}`);
      }
    }

    this.logger.log(`Auto-cleanup: deleted ${deleted} items older than ${RETENTION_DAYS} days`);
    return deleted;
  }
}
