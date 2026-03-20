import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { RecycleBinService } from '../services/recycle-bin.service';
import { RecycleBinItemType } from '../types';

export class MoveToRecycleBinDto {
  @IsString()
  itemType!: RecycleBinItemType;

  @IsString()
  itemId!: string;

  @IsString()
  originalLocation!: string;
}

@ApiTags('recycle-bin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recycle-bin')
export class RecycleBinController {
  constructor(private readonly recycleBinService: RecycleBinService) {}

  @Get()
  @ApiOperation({ summary: 'List recycle bin items' })
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.recycleBinService.listItems(user.id);
  }

  @Post('move')
  @ApiOperation({ summary: 'Move item to recycle bin' })
  async moveToRecycleBin(
    @Body() dto: MoveToRecycleBinDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.recycleBinService.moveToRecycleBin(
      user.id,
      dto.itemType,
      dto.itemId,
      dto.originalLocation,
    );
    return { message: 'Item moved to recycle bin' };
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore item from recycle bin' })
  async restore(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.recycleBinService.restore(user.id, id);
    return { message: 'Item restored' };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete an item from recycle bin' })
  async permanentDelete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.recycleBinService.permanentDelete(user.id, id);
    return { message: 'Item permanently deleted' };
  }
}
