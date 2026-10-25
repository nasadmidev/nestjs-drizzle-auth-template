import { of } from 'rxjs';
import { Role, User } from '@/db/schema';
import { ResponseInterceptor } from './response.interceptor';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Response, Request } from 'express';
import type { HttpArgumentsHost } from '@nestjs/common/internal';
import { lastValueFrom } from 'rxjs';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<User>;
  let mockContext: DeepMockProxy<ExecutionContext>;

  beforeEach(() => {
    mockContext = mockDeep<ExecutionContext>();
    interceptor = new ResponseInterceptor<User>();
  });

  it('should return a parsed response with User model', async () => {
    const id = randomUUID();

    const mockResponse: Pick<Response, 'statusCode'> = {
      statusCode: 200,
    };

    const mockRequest: Pick<Request, 'method' | 'path'> = {
      method: 'GET',
      path: '/user',
    };

    mockContext.switchToHttp.mockReturnValue({
      getRequest: () => mockRequest,
      getResponse: () => mockResponse,
      getNext: jest.fn,
    } as unknown as HttpArgumentsHost);

    const mockUser: User = {
      id,
      email: 'test@test.com',
      password: 'Test1234',
      role: Role['ADMIN'],
      createdAt: new Date(),
    };

    const mockHandler: CallHandler = {
      handle: () => of(mockUser),
    };

    const interception = interceptor.intercept(mockContext, mockHandler);
    const response = await lastValueFrom(interception);

    expect(response).toEqual({
      statusCode: mockResponse.statusCode,
      path: `${mockRequest.method} ${mockRequest.path}`,
      date: expect.any(String) as string,

      data: mockUser,
    });
    expect(response.data).toEqual(mockUser);
  });
});
