import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import type { DrizzleDatabase } from './schema';
import {
  DrizzleException,
  type DrizzleExceptionData,
} from './drizzle-exception/drizzle.exception';
import type { DrizzleQueryError } from 'drizzle-orm';

@Injectable()
export class DrizzleService {
  constructor(@InjectDrizzle() private readonly drizzle: DrizzleDatabase) {}

  async execute<T>(operation: (db: DrizzleDatabase) => Promise<T>): Promise<T> {
    try {
      return await operation(this.drizzle);
    } catch (e) {
      const error = e as DrizzleQueryError;
      const pgError = error.cause || error;

      const drizzleExceptionData: DrizzleExceptionData = {
        code: (pgError as unknown as DrizzleExceptionData).code || 'UNKNOWN',
        column: (pgError as unknown as DrizzleExceptionData).column,
        message: pgError.message || error.message || 'Unknown database error',
      };

      throw new DrizzleException(drizzleExceptionData);
    }
  }
}
