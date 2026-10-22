import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { refreshTokens } from '@/db/schema';
import { lt } from 'drizzle-orm';
import { DrizzleService } from '@/db/drizzle.service';

@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger(TokenCleanupService.name);

  constructor(private readonly drizzleService: DrizzleService) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleCron() {
    const result = await this.drizzleService.execute(async (db) => {
      return await db
        .delete(refreshTokens)
        .where(lt(refreshTokens.expiresAt, new Date(Date.now())))
        .returning({ id: refreshTokens.id });
    });

    this.logger.log(
      `Deleted expired tokens (${result.length}): ${result.map((r) => r.id).join(',')}`,
    );
  }
}
