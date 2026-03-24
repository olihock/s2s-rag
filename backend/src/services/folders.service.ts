import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { Folder } from '../types';

@Injectable()
export class FoldersService {
  private readonly logger = new Logger(FoldersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, name: string, parentFolderId?: string): Promise<Folder> {
    // Check name uniqueness per user/parent
    const existing = await this.prisma.folder.findFirst({
      where: { ownerId, name, parentFolderId: parentFolderId ?? null },
    });
    if (existing) {
      throw new ConflictException('A folder with this name already exists at this location');
    }

    const folder = await this.prisma.folder.create({
      data: { ownerId, name, parentFolderId: parentFolderId ?? null },
    });

    return this.mapFolder(folder);
  }

  async listByUser(ownerId: string): Promise<Folder[]> {
    const folders = await this.prisma.folder.findMany({ where: { ownerId } });
    return folders.map((f: Parameters<typeof this.mapFolder>[0]) => this.mapFolder(f));
  }

  async findById(id: string, userId: string): Promise<Folder> {
    const folder = await this.prisma.folder.findUnique({ where: { id } });
    if (!folder) throw new NotFoundException('Folder not found');
    if (folder.ownerId !== userId) throw new ForbiddenException();
    return this.mapFolder(folder);
  }

  async rename(id: string, userId: string, newName: string): Promise<Folder> {
    await this.findById(id, userId);
    const folder = await this.prisma.folder.update({
      where: { id },
      data: { name: newName },
    });
    return this.mapFolder(folder);
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.findById(id, userId);
    await this.prisma.folder.delete({ where: { id } });
  }

  async shareFolder(folderId: string, ownerId: string, recipientEmail: string): Promise<void> {
    await this.findById(folderId, ownerId);

    const recipient = await this.prisma.user.findUnique({ where: { email: recipientEmail } });
    if (!recipient) {
      throw new BadRequestException('User with this email does not exist');
    }

    if (recipient.id === ownerId) {
      throw new BadRequestException('Cannot share a folder with yourself');
    }

    const existing = await this.prisma.folderShare.findUnique({
      where: { folderId_recipientUserId: { folderId, recipientUserId: recipient.id } },
    });
    if (existing) {
      throw new ConflictException('Folder is already shared with this user');
    }

    await this.prisma.folderShare.create({
      data: { folderId, recipientUserId: recipient.id, permission: 'read' },
    });

    this.logger.log(`Folder ${folderId} shared with ${recipientEmail}`);
  }

  async revokeShare(folderId: string, ownerId: string, recipientEmail: string): Promise<void> {
    await this.findById(folderId, ownerId);

    const recipient = await this.prisma.user.findUnique({ where: { email: recipientEmail } });
    if (!recipient) throw new NotFoundException('User not found');

    await this.prisma.folderShare.deleteMany({
      where: { folderId, recipientUserId: recipient.id },
    });
  }

  private mapFolder(f: {
    id: string;
    ownerId: string;
    name: string;
    parentFolderId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Folder {
    return {
      id: f.id,
      ownerId: f.ownerId,
      name: f.name,
      parentFolderId: f.parentFolderId,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    };
  }
}
