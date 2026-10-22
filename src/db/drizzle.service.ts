import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import type { DrizzleDatabase } from './schema';
import {
  DrizzleException,
  type DrizzleExceptionData,
} from './drizzle-exception/drizzle.exception';

@Injectable()
export class DrizzleService {
  constructor(@InjectDrizzle() private readonly drizzle: DrizzleDatabase) {}

  async execute<T>(operation: (db: DrizzleDatabase) => Promise<T>): Promise<T> {
    try {
      return await operation(this.drizzle);
    } catch (e) {
      const error = e as DrizzleExceptionData;
      throw new DrizzleException(error);
    }
  }
}
