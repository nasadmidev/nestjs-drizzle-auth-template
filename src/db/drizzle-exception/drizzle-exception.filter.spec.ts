import { DrizzleExceptionFilter } from './drizzle-exception.filter';
import { ArgumentsHost, InternalServerErrorException } from '@nestjs/common';
import { Response } from 'express';
import { DrizzleException } from './drizzle.exception';

describe('DrizzleExceptionFilter', () => {
  it('should be defined', () => {
    expect(new DrizzleExceptionFilter()).toBeDefined();
  });

  it('should handle Drizzle PostgreSQL errors with known codes', () => {
    const filter = new DrizzleExceptionFilter();
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    const mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue({}),
      }),
    } as unknown as ArgumentsHost;

    // Test unique constraint error
    const uniqueError = new DrizzleException({
      code: '23505',
      message: 'duplicate key',
    });
    filter.catch(uniqueError, mockHost);
    expect(mockResponse.status).toHaveBeenCalledWith(409);
    expect(mockResponse.json).toHaveBeenCalledWith({
      message: 'Unique constraint failed',
    });

    jest.clearAllMocks();

    // Test foreign key error
    const fkError = new DrizzleException({
      code: '23503',
      message: 'foreign key violation',
    });
    filter.catch(fkError, mockHost);
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      message: 'Foreign key constraint failed / Related record does not exist',
    });
  });

  it('should wrap errors with unknown PostgreSQL codes in InternalServerErrorException', () => {
    const filter = new DrizzleExceptionFilter();
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    const mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue({}),
      }),
    } as unknown as ArgumentsHost;

    // Test unknown PostgreSQL code
    const unknownCodeError = new DrizzleException({
      code: '99999',
      message: 'Unknown error',
    });
    expect(() => filter.catch(unknownCodeError, mockHost)).toThrow(
      InternalServerErrorException,
    );
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });

  it('should handle null constraint violation with column name', () => {
    const filter = new DrizzleExceptionFilter();
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    const mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue({}),
      }),
    } as unknown as ArgumentsHost;

    const nullError = new DrizzleException({
      code: '23502',
      column: 'email',
      message: 'null violation',
    });
    filter.catch(nullError, mockHost);
    expect(mockResponse.status).toHaveBeenCalledWith(409);
    expect(mockResponse.json).toHaveBeenCalledWith({
      message: 'Null constraint violation on column: email',
    });
  });
});
