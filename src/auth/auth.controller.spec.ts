import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { AuthGuard } from '@nestjs/passport';
import { HttpAdapterHost } from '@nestjs/core';
import type { Request, Response } from 'express';
import { User, Role } from '@/db/schema';
import { UserService } from '@/user/user.service';
import { BadRequestException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: DeepMockProxy<AuthService>;
  let mockHttpAdapterHost: DeepMockProxy<HttpAdapterHost>;
  let mockUserService: DeepMockProxy<UserService>;

  beforeEach(async () => {
    mockAuthService = mockDeep<AuthService>();
    mockHttpAdapterHost = mockDeep<HttpAdapterHost>();
    mockHttpAdapterHost.httpAdapter.setCookie.mockImplementation(() => {});
    mockHttpAdapterHost.httpAdapter.clearCookie.mockImplementation(() => {});
    mockUserService = mockDeep<UserService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: HttpAdapterHost,
          useValue: mockHttpAdapterHost,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    })
      .overrideGuard(AuthGuard('local'))
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthGuard('google'))
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  const userMock = {
    id: 'user-id',
    email: 'user@user.com',
    role: Role['USER'],
    password: 'hashed',
    createdAt: new Date(),
  };

  describe('login controller', () => {
    it('should return jwt-token', async () => {
      mockAuthService.login.mockResolvedValue({
        accessToken: 'jwt-token',
        refreshToken: 'refresh-token',
      });
      const mockReq = {
        user: {
          id: 'user-id',
          email: 'user@user.com',
          role: Role['USER'],
          password: 'hashed',
          createdAt: new Date(),
        },
      } as Partial<Request>;
      const result = await controller.loginWithoutCookie(
        mockReq as Request & { user?: User },
      );
      expect(mockAuthService.login).toHaveBeenCalledWith(mockReq.user);
      expect(result).toEqual({
        accessToken: 'jwt-token',
        refreshToken: 'refresh-token',
      });
    });

    it('should call authService.login with the user', async () => {
      mockAuthService.login.mockResolvedValue({
        accessToken: 'jwt-token',
        refreshToken: 'refresh-token',
      });
      const mockReq = {
        user: {
          id: 'user-id',
          email: 'user@user.com',
          role: Role['USER'],
          password: 'hashed',
          createdAt: new Date(),
        },
      } as Partial<Request>;
      const mockRes = mockDeep<Response>();
      const result = await controller.login(
        mockReq as Request & { user?: User },
        mockRes,
      );
      expect(mockAuthService.login).toHaveBeenCalledWith(mockReq.user);
      expect(result).toEqual({ message: 'Logged in successfully' });
    });
  });

  describe('regenerate', () => {
    it('return a regenerated token', async () => {
      mockAuthService.regenerateToken.mockResolvedValue({
        accessToken: 'new-token',
        refreshToken: 'new-refresh-token',
      });
      const mockRes = mockDeep<Response>();
      const result = await controller.regenerateToken(
        mockRes,
        'token',
        undefined,
      );
      expect(result).toEqual({
        accessToken: 'new-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('return a regenerated token from cookie', async () => {
      mockAuthService.regenerateToken.mockResolvedValue({
        accessToken: 'new-token',
        refreshToken: 'new-refresh-token',
      });
      const mockRes = mockDeep<Response>();
      const result = await controller.regenerateToken(
        mockRes,
        undefined,
        'cookie-token',
      );
      expect(result).toEqual({ message: 'Token refreshed' });
    });

    it('should throw BadRequestException when no token provided', async () => {
      const mockRes = mockDeep<Response>();
      await expect(
        controller.regenerateToken(mockRes, undefined, undefined),
      ).rejects.toThrow('No refresh token defined');
    });
  });

  describe('logout', () => {
    it('should call clear cookie for tokens', () => {
      const mockRes = mockDeep<Response>();
      const result = controller.logout(mockRes);
      expect(result).toEqual({ message: 'Logout successfully' });
      expect(mockHttpAdapterHost.httpAdapter.clearCookie).toHaveBeenCalledWith(
        mockRes,
        'refresh_token',
      );
      expect(mockHttpAdapterHost.httpAdapter.clearCookie).toHaveBeenCalledWith(
        mockRes,
        'access_token',
      );
    });
  });

  describe('register', () => {
    it('should create a new user and try to set cookies in type set with "cookies"', async () => {
      mockUserService.create.mockResolvedValue([userMock]);
      mockAuthService.login.mockResolvedValue({
        accessToken: '',
        refreshToken: '',
      });
      const mockRes = mockDeep<Response>();
      const result = await controller.register(
        mockRes,
        { email: userMock.email, password: userMock.password },
        'cookies',
      );
      expect(result).toEqual({ message: 'Registration successfully' });
      expect(mockUserService.create).toHaveBeenCalledWith({
        email: userMock.email,
        password: userMock.password,
        role: Role['USER'],
      });
      expect(mockAuthService.login).toHaveBeenCalledWith(userMock);
    });

    it('should create a new user and return tokens in type set with "json"', async () => {
      mockUserService.create.mockResolvedValue([userMock]);
      mockAuthService.login.mockResolvedValue({
        accessToken: '',
        refreshToken: '',
      });
      const mockRes = mockDeep<Response>();
      const result = await controller.register(
        mockRes,
        { email: userMock.email, password: userMock.password },
        'json',
      );
      expect(result).toEqual({ accessToken: '', refreshToken: '' });
      expect(mockUserService.create).toHaveBeenCalledWith({
        email: userMock.email,
        password: userMock.password,
        role: Role['USER'],
      });
      expect(mockAuthService.login).toHaveBeenCalledWith(userMock);
    });

    it('should throw BadRequestException on invalid type registration', async () => {
      const mockRes = mockDeep<Response>();
      await expect(
        controller.register(
          mockRes,
          { email: userMock.email, password: userMock.password },
          'any' as 'json',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
