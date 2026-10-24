import type { Response } from 'supertest';

export const responseInterceptorGenericObject = <T>(
  res: Response,
  path: string,
  data: T,
) => ({
  statusCode: res.status,
  date: expect.any(String) as string,
  path: `${res.request.method} ${path}`,
  data,
});
