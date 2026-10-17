import {
  Controller,
  Post,
  Req,
  UseGuards,
  Put,
  Body,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { User } from '@/db/schema';
import { Public } from './jwt/public.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import ms, { StringValue } from 'ms';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
    const token = await this.authService.login(req.user as User);
    response.cookie('access_token', token, {
      maxAge: ms((process.env.JWT_EXPIRES as StringValue) ?? '1h'),
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });

    return { message: 'Logged in successfully' };
  }

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

  @Public()
  @Put('regenerate')
  @ApiOperation({ summary: 'Regenerate access token using refresh token' })
  @ApiResponse({ status: 200, description: 'New JWT token pair' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async regenerateToken(@Body('token') token: string) {
    return await this.authService.regenerateToken(token);
  }
}
