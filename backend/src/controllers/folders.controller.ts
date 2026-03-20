import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { FoldersService } from '../services/folders.service';

export class CreateFolderDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  parentFolderId?: string;
}

export class ShareFolderDto {
  @IsString()
  email!: string;
}

@ApiTags('folders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a folder' })
  async create(@Body() dto: CreateFolderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.foldersService.create(user.id, dto.name, dto.parentFolderId);
  }

  @Get()
  @ApiOperation({ summary: 'List user folders' })
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.foldersService.listByUser(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get folder by ID' })
  async getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.foldersService.findById(id, user.id);
  }

  @Patch(':id/rename')
  @ApiOperation({ summary: 'Rename a folder' })
  async rename(
    @Param('id') id: string,
    @Body('name') name: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.foldersService.rename(id, user.id, name);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a folder' })
  async delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.foldersService.delete(id, user.id);
    return { message: 'Folder deleted' };
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Share folder with user by email' })
  async share(
    @Param('id') id: string,
    @Body() dto: ShareFolderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.foldersService.shareFolder(id, user.id, dto.email);
    return { message: 'Folder shared successfully' };
  }

  @Delete(':id/share')
  @ApiOperation({ summary: 'Revoke folder share' })
  async revokeShare(
    @Param('id') id: string,
    @Body() dto: ShareFolderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.foldersService.revokeShare(id, user.id, dto.email);
    return { message: 'Share revoked' };
  }
}
