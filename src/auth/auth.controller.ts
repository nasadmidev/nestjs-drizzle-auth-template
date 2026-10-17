import { Controller, Post, Req, UseGuards, Put, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { User } from '@/db/schema';
import { Public } from './jwt/public.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(AuthGuard('local'))
  @Post('login')
  @ApiOperation({ summary: 'Login with username and password' })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns JWT token',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Req() req: Request & { user?: User }) {
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
