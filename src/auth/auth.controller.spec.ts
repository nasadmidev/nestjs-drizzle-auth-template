import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { User, Role } from '@/db/schema';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: DeepMockProxy<AuthService>;

  beforeEach(async () => {
    mockAuthService = mockDeep<AuthService>();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
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

  describe('login controller', () => {
    it('should return jwt-token', async () => {
      mockAuthService.login.mockResolvedValue('jwt-token');
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
      expect(result).toBe('jwt-token');
    });

    it('should call authService.login with the user', async () => {
      mockAuthService.login.mockResolvedValue('jwt-token');
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
      mockAuthService.regenerateToken.mockResolvedValue('new-token');
      const result = await controller.regenerateToken('token');
      expect(result).toBe('new-token');
    });
  });
});
