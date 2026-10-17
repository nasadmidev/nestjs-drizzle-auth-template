import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { Role } from '@/db/schema';

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
      const result = await controller.login(mockReq as Request);
      expect(mockAuthService.login).toHaveBeenCalledWith(mockReq.user);
      expect(result).toBe('jwt-token');
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
