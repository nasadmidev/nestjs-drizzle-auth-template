import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JsonWebTokenError, JwtService, TokenExpiredError } from '@nestjs/jwt';
import type { Request } from 'express';
import type { JwtPayload } from '@/auth/auth.service';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token =
      this.extracTokenFromCookies(request) ??
      this.extractTokenFromHeader(request);
    if (!token) throw new UnauthorizedException('Missing token');
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      request['user'] = payload;
      return true;
    } catch (e) {
      if (e instanceof TokenExpiredError) {
        throw new ForbiddenException(
          `Token expired: ${e.expiredAt.toISOString()}`,
        );
      }
      if (e instanceof JsonWebTokenError) {
        throw new ForbiddenException('Invalid token');
      }
      return false;
    }
  }

  extracTokenFromCookies(request: Request): string | null {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const cookies = request.cookies;
    if (!cookies) {
      return null;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return (cookies.access_token as string) ?? null;
    }
  }

  extractTokenFromHeader(request: Request): string | null {
    const authHeader = request.headers['authorization'];
    if (!authHeader) return null;
    const [type, token] = authHeader ? authHeader.split(' ') : [];
    return type === 'Bearer' && token ? token : null;
  }
}
