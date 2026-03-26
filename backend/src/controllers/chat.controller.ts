import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { RagService } from '../services/rag.service';
import { SupportedLanguage, ChatQueryResult } from '../types';
import { UseGuards } from '@nestjs/common';

export class ChatQueryDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsOptional()
  @IsIn(['en', 'de'])
  language?: SupportedLanguage;
}

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly ragService: RagService) {}

  @Post('query')
  @ApiOperation({ summary: 'Text Q&A across all user documents' })
  async chatQuery(
    @Body() dto: ChatQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ChatQueryResult> {
    const queryLanguage: SupportedLanguage = dto.language ?? 'en';
    this.logger.log(
      `Chat query [user=${user.id}] lang=${queryLanguage}: "${dto.message.slice(0, 80)}"`,
    );

    const { answer, sources } = await this.ragService.query(dto.message, queryLanguage, user.id);
    return { answer, sources };
  }
}
