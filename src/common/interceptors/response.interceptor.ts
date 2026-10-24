import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { map, Observable } from 'rxjs';

export interface ApiResponse<T> {
  statusCode: number;
  path: string;
  date: string;
  data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    return next.handle().pipe(
      map((data) => {
        let response: ApiResponse<T>;
        if (data === null) {
          response = {
            statusCode: 404,
            path: `${req.method} ${req.path}`,
            date: new Date().toISOString(),
            data,
          };
        } else if (Array.isArray(data) && data.length === 1) {
          response = {
            statusCode: res.statusCode,
            path: `${req.method} ${req.path}`,
            date: new Date().toISOString(),
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            data: data[0],
          };
        } else {
          response = {
            statusCode: res.statusCode,
            path: `${req.method} ${req.path}`,
            date: new Date().toISOString(),
            data,
          };
        }

        res.locals = {
          responseBody: response,
        };
        return response;
      }),
    );
  }
}
