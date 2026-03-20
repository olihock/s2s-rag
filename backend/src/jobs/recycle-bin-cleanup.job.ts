import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecycleBinService } from '../services/recycle-bin.service';

@Injectable()
export class RecycleBinCleanupJob {
  private readonly logger = new Logger(RecycleBinCleanupJob.name);

  constructor(private readonly recycleBinService: RecycleBinService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runCleanup(): Promise<void> {
    this.logger.log('Running recycle bin auto-cleanup job...');
    try {
      const deleted = await this.recycleBinService.autoCleanup();
      this.logger.log(`Cleanup complete: ${deleted} expired items permanently deleted`);
    } catch (err) {
      this.logger.error('Recycle bin cleanup job failed', err);
    }
  }
}
