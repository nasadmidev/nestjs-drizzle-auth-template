import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class DrizzleExceptionFilter implements ExceptionFilter {
  logger: Logger = new Logger();

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      return response
        .status(exception.getStatus())
        .json(exception.getResponse());
    }

    const drizzleError = exception as {
      code?: string;
      column?: string;
      message?: string;
    };

    if (drizzleError?.code) {
      let statusCode: number;
      let message: string;

      switch (drizzleError.code) {
        case '23505':
          statusCode = 409;
          message = 'Unique constraint failed';
          break;
        case '23502':
          statusCode = 409;
          message = `Null constraint violation on column: ${drizzleError.column || 'unknown'}`;
          break;
        case '23503':
          statusCode = 400;
          message =
            'Foreign key constraint failed / Related record does not exist';
          break;
        case '23514':
          statusCode = 400;
          message = 'Check constraint failed on database';
          break;
        case '22P02':
          statusCode = 400;
          message = 'Invalid input syntax for type (e.g., malformed UUID)';
          break;
        case '22003':
          statusCode = 400;
          message = 'Number out of range';
          break;
        case '22001':
          statusCode = 400;
          message = 'Value too long for column type';
          break;
        case '42P01':
          statusCode = 500;
          message = 'Table does not exist in the database';
          break;
        case '42703':
          statusCode = 500;
          message = 'Column does not exist in the database';
          break;
        case '42601':
          statusCode = 500;
          message = 'SQL syntax error or query parsing failed';
          break;
        default:
          this.logger.warn(
            `Database error could not be managed by DrizzleException: ${drizzleError.code}`,
          );
          throw new InternalServerErrorException('Database error occurred');
      }
      return response.status(statusCode).json({ message });
    }

    if (exception instanceof Error) {
      throw new InternalServerErrorException(exception.message);
    }

    throw new InternalServerErrorException('An unexpected error occurred');
  }
}
