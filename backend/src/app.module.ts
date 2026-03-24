import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './db/database.module';
import { VectorModule } from './vector/vector.module';
import { AuthModule } from './auth/auth.module';
import { DocumentsController } from './controllers/documents.controller';
import { VoiceController } from './controllers/voice.controller';
import { OcrController } from './controllers/ocr.controller';
import { FoldersController } from './controllers/folders.controller';
import { RecycleBinController } from './controllers/recycle-bin.controller';
import { ChatController } from './controllers/chat.controller';
import { DocumentsService } from './services/documents.service';
import { SttService } from './services/stt.service';
import { LlmService } from './services/llm.service';
import { TtsService } from './services/tts.service';
import { OcrService } from './services/ocr.service';
import { FoldersService } from './services/folders.service';
import { RecycleBinService } from './services/recycle-bin.service';
import { UserService } from './services/user.service';
import { RecycleBinCleanupJob } from './jobs/recycle-bin-cleanup.job';
import { SharedFolderGuard } from './guards/shared-folder.guard';
import { LoggingMiddleware } from './middleware/logging.middleware';

@Module({
  imports: [ScheduleModule.forRoot(), DatabaseModule, VectorModule, AuthModule],
  controllers: [
    DocumentsController,
    VoiceController,
    OcrController,
    FoldersController,
    RecycleBinController,
    ChatController,
  ],
  providers: [
    DocumentsService,
    SttService,
    LlmService,
    TtsService,
    OcrService,
    FoldersService,
    RecycleBinService,
    UserService,
    RecycleBinCleanupJob,
    SharedFolderGuard,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
