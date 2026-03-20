import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { AuthenticatedUser } from '../auth/current-user.decorator';

interface RequestWithUser {
  user: AuthenticatedUser;
  params: { id?: string };
}

@Injectable()
export class SharedFolderGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    const folderId = request.params.id;

    if (!folderId || !user) return false;

    // Check if the user is the folder owner
    const folder = await this.prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder) return false;
    if (folder.ownerId === user.id) return true;

    // Check if folder is shared with this user
    const share = await this.prisma.folderShare.findFirst({
      where: { folderId, recipientUserId: user.id },
    });

    if (!share) {
      throw new ForbiddenException('You do not have access to this folder');
    }

    return true;
  }
}
