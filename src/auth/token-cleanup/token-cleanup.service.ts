import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { type DrizzleDatabase, refreshTokens } from '@/db/schema';
import { InjectDrizzle } from '@nestjs/drizzle';
import { lt } from 'drizzle-orm';

@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger(TokenCleanupService.name);

  constructor(@InjectDrizzle() private readonly drizzle: DrizzleDatabase) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleCron() {
    const result = await this.drizzle
      .delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, new Date(Date.now())))
      .returning({ id: refreshTokens.id });
    this.logger.log(
      `Deleted expired tokens (${result.length}): ${result.map((r) => r.id).join(',')}`,
    );
  }
}
