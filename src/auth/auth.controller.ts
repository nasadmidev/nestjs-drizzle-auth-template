import {
  Controller,
  Post,
  Req,
  UseGuards,
  Put,
  Body,
  Res,
  Cookies,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { User } from '@/db/schema';
import { Public } from './jwt/public.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import ms, { StringValue } from 'ms';
import { Throttle } from '@nestjs/throttler';
import { HttpAdapterHost } from '@nestjs/core';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly adapterHost: HttpAdapterHost,
  ) {}

  private setTokensCookies(
    refreshToken: string,
    accessToken: string,
    response: Response,
  ) {
    this.adapterHost.httpAdapter.setCookie(
      response,
      'access_token',
      accessToken,
      {
        maxAge: ms((process.env.JWT_EXPIRES as StringValue) ?? '1h'),
        sameSite: 'lax',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      },
    );

    this.adapterHost.httpAdapter.setCookie(
      response,
      'refresh_token',
      refreshToken,
      {
        maxAge: ms((process.env.REFRESH_TOKEN_EXPIRES as StringValue) ?? '7d'),
        sameSite: 'lax',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/auth/regenerate',
      },
    );
  }

  @Throttle({ default: { limit: 10, ttl: ms('1m') } })
  @Public()
  @UseGuards(AuthGuard('local'))
  @Post('login/set-cookie')
  @ApiOperation({ summary: 'Login with username and password' })
  @ApiResponse({
    status: 200,
    description:
      'Login successful, returns JWT token on Set-Cookie Header (Web Applications)',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Req() req: Request & { user?: User },
    @Res({ passthrough: true }) response: Response,
  ) {
    const { refreshToken, accessToken } = await this.authService.login(
      req.user as User,
    );
    this.setTokensCookies(refreshToken, accessToken, response);
    return { message: 'Logged in successfully' };
  }

  @Throttle({ default: { limit: 10, ttl: ms('1m') } })
  @Public()
  @UseGuards(AuthGuard('local'))
  @Post('login')
  @ApiOperation({ summary: 'Login with username and password' })
  @ApiResponse({
    status: 200,
    description:
      'Login successful, returns JWT token for NO Web Clients (Generics Client, Other APIS)',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async loginWithoutCookie(@Req() req: Request & { user?: User }) {
    return await this.authService.login(req.user as User);
  }

  @Throttle({ default: { limit: 10, ttl: ms('1m') } })
  @Public()
  @Put('regenerate')
  @ApiOperation({ summary: 'Regenerate access token using refresh token' })
  @ApiResponse({ status: 200, description: 'New JWT token' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async regenerateToken(
    @Res({ passthrough: true }) response: Response,
    @Body('refreshToken') token?: string,
    @Cookies('refresh_token') tokenCookie?: string,
  ) {
    if (token) {
      return await this.authService.regenerateToken(token);
    }

    if (tokenCookie) {
      const { refreshToken, accessToken } =
        await this.authService.regenerateToken(tokenCookie);
      this.setTokensCookies(refreshToken, accessToken, response);
      return { message: 'Token refreshed' };
    }

    throw new BadRequestException('No refresh token defined');
  }
}
