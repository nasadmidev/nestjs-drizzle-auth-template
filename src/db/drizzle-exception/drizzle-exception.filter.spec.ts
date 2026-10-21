import { DrizzleExceptionFilter } from './drizzle-exception.filter';
import { ArgumentsHost, HttpException, InternalServerErrorException } from '@nestjs/common';
import { Response } from 'express';

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
    const uniqueError = { code: '23505', message: 'duplicate key' };
    filter.catch(uniqueError, mockHost);
    expect(mockResponse.status).toHaveBeenCalledWith(409);
    expect(mockResponse.json).toHaveBeenCalledWith({
      message: 'Unique constraint failed',
    });

    jest.clearAllMocks();

    // Test foreign key error
    const fkError = { code: '23503', message: 'foreign key violation' };
    filter.catch(fkError, mockHost);
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      message: 'Foreign key constraint failed / Related record does not exist',
    });
  });

  it('should handle HttpException by returning its response', () => {
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

    const httpException = new HttpException('Not found', 404);
    filter.catch(httpException, mockHost);
    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith(httpException.getResponse());
  });

  it('should wrap errors without a code property (non-Drizzle errors) in InternalServerErrorException', () => {
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

    // Test error without code (non-Drizzle error)
    const genericError = new Error('Generic error');
    expect(() => filter.catch(genericError, mockHost)).toThrow(
      InternalServerErrorException,
    );
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
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
    const unknownCodeError = { code: '99999', message: 'Unknown error' };
    expect(() => filter.catch(unknownCodeError, mockHost)).toThrow(
      InternalServerErrorException,
    );
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });

  it('should wrap unknown error types in InternalServerErrorException', () => {
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

    // Test unknown error type (not an Error instance)
    const unknownError = 'string error';
    expect(() => filter.catch(unknownError, mockHost)).toThrow(
      InternalServerErrorException,
    );
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });
});
