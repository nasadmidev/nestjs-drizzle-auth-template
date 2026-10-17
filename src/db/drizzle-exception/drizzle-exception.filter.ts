import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Response } from 'express';

@Catch()
export class DrizzleExceptionFilter
  extends BaseExceptionFilter
  implements ExceptionFilter
{
  catch(exception: { [k: string]: string }, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    let statusCode: number;
    let message: string;

    if (exception?.code) {
      switch (exception.code) {
        case '23505':
          statusCode = 409;
          message = 'Unique constraint failed';
          break;
        case '23502':
          statusCode = 409;
          message = `Null constraint violation on column: ${exception.column || 'unknown'}`;
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
          statusCode = 500;
          message = exception.message || 'Internal server error';
      }
      return response.status(statusCode).json({ message });
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const errorResponse = exception.getResponse();
      return response
        .status(status)
        .json(
          typeof errorResponse === 'object'
            ? errorResponse
            : { message: errorResponse },
        );
    } else {
      return response.status(HttpStatus['INTERNAL_SERVER_ERROR']).json({
        message: exception.message || 'Internal Server Error',
      });
    }
  }
}
