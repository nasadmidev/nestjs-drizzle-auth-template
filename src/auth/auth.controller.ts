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
  Delete,
  HttpStatus,
  Query,
  HttpCode,
} from '@nestjs/common';
import { AuthService, type RequestAuthorized } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { Role, User } from '@/db/schema';
import { Public } from './jwt/public.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  PickType,
} from '@nestjs/swagger';
import ms, { StringValue } from 'ms';
import { Throttle } from '@nestjs/throttler';
import { HttpAdapterHost } from '@nestjs/core';
import { UserService } from '@/user/user.service';
import { CreateUserDTO } from '@/user/user.dto';

class RegisterUserDTO extends PickType(CreateUserDTO, ['email', 'password']) {}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly adapterHost: HttpAdapterHost,
    private readonly userService: UserService,
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
  @ApiResponse({
    status: 200,
    description:
      'Set a new JWT access_token and refresh_token using Set-Header',
  })
  @ApiResponse({
    status: 200,
    description:
      'Return JWT accessToken and refreshToken in JSON response body',
  })
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

  @Delete('logout')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete refresh_token and access_token from cookies',
  })
  @ApiResponse({ status: 200, description: 'Token deleted from cookies' })
  async logout(
    @Req() req: RequestAuthorized,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.adapterHost.httpAdapter.clearCookie(response, 'access_token');
    this.adapterHost.httpAdapter.clearCookie(response, 'refresh_token');
    await this.authService.logout(req.user.sub);
    return { message: 'Logout successfully' };
  }

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: ms('1m') } })
  @Public()
  @ApiOperation({ summary: 'Register a new user' })
  @ApiQuery({
    name: 'type',
    enum: ['cookies', 'json'],
    description: 'Specify how to return the tokens, like Set-Cookie or JSON',
  })
  @ApiResponse({ status: 201, description: 'New user created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({
    status: HttpStatus['CONFLICT'],
    description: 'A user with a constraint key already exists',
  })
  @HttpCode(HttpStatus['CREATED'])
  async register(
    @Res({ passthrough: true }) response: Response,
    @Body() data: RegisterUserDTO,
    @Query('type') type?: 'cookies' | 'json',
  ) {
    if (type === 'cookies') {
      const user = (
        await this.userService.create({
          ...data,
          role: Role['USER'],
        })
      )[0];
      const { refreshToken, accessToken } = await this.authService.login(user);
      this.setTokensCookies(refreshToken, accessToken, response);
      return { message: 'Registration successfully' };
    }

    if (type === 'json') {
      const user = (
        await this.userService.create({
          ...data,
          role: Role['USER'],
        })
      )[0];
      return await this.authService.login(user);
    }

    throw new BadRequestException('You must specify how to return the tokens');
  }
}
