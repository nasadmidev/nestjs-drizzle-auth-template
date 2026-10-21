import { Test, TestingModule } from '@nestjs/testing';
import { AuthService, JwtPayload } from './auth.service';
import { UserService } from '@/user/user.service';
import { JwtService, TokenExpiredError, JsonWebTokenError } from '@nestjs/jwt';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import bcrypt from 'bcrypt';
import { Role, User } from '@/db/schema';
import { getDrizzleToken } from '@nestjs/drizzle';

describe('AuthService', () => {
  let service: AuthService;
  let userMockService: DeepMockProxy<UserService>;
  let jwtMockService: DeepMockProxy<JwtService>;
  let drizzleMock: { [k: string]: jest.Mock };

  beforeEach(async () => {
    userMockService = mockDeep<UserService>();
    jwtMockService = mockDeep<JwtService>();
    drizzleMock = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userMockService },
        { provide: JwtService, useValue: jwtMockService },
        {
          provide: getDrizzleToken(),
          useValue: drizzleMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('authenticate', () => {
    it('should return user if credentials are valid (email)', async () => {
      const spy = jest
        .spyOn(bcrypt, 'compare')
        .mockResolvedValue(true as never);
      const user = {
        identity: 'test@example.com',
        password: 'hashed-password',
      };
      userMockService.findOneByEmail.mockResolvedValue([
        {
          email: 'test@example.com',
          password: 'hashed-password',
          id: 'user-id',
          createdAt: new Date(),
          role: Role['USER'],
        },
      ]);
      const result = await service.authenticate(user);
      expect(result).toBeTruthy();
      expect(userMockService.findOneByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(spy).toHaveBeenCalledWith('hashed-password', 'hashed-password');
    });

    it('should return null if user is not found', async () => {
      userMockService.findOneByEmail.mockResolvedValue([]);
      const result = await service.authenticate({
        identity: 'nonexistent-user',
        password: 'password',
      });
      expect(result).toBeNull();
      expect(userMockService.findOneByEmail).toHaveBeenCalledWith(
        'nonexistent-user',
      );
    });

    it('should return null if password is incorrect', async () => {
      const spy = jest
        .spyOn(bcrypt, 'compare')
        .mockResolvedValue(false as never);
      userMockService.findOneByEmail.mockResolvedValue([
        {
          email: 'test@example.com',
          password: 'hashed-password',
          id: 'user-id',
          createdAt: new Date(),
          role: Role['USER'],
        },
      ]);
      const result = await service.authenticate({
        identity: 'test-user',
        password: 'wrong-password',
      });
      expect(result).toBeNull();
      expect(userMockService.findOneByEmail).toHaveBeenCalledWith('test-user');
      expect(spy).toHaveBeenCalledWith('wrong-password', 'hashed-password');
    });
  });

  describe('login', () => {
    it('should return a JWT token for a valid user', async () => {
      const user: User = {
        email: 'test@example.com',
        password: 'hashed-password',
        id: 'user-id',
        createdAt: new Date(),
        role: Role['USER'],
      };

      jwtMockService.signAsync.mockResolvedValue('jwt-token');

      const result = await service.login(user);
      expect(result).toEqual({
        accessToken: 'jwt-token',
        refreshToken: 'jwt-token',
      });
      expect(jwtMockService.signAsync).toHaveBeenCalledWith({
        sub: 'user-id',
        role: Role['USER'],
      });
    });

    it('should throw BadRequestException if user is null', async () => {
      await expect(service.login(null)).rejects.toThrow('User is required');
    });
  });

  describe('regenerate token', () => {
    const payloadData: JwtPayload = {
      role: Role['USER'],
      sub: 'id-123',
    };

    const mockPayload: JwtPayload = {
      ...payloadData,
      exp: 12,
      iat: 23,
    };

    it('should regenerate token', async () => {
      jwtMockService.verifyAsync.mockResolvedValue(mockPayload);
      jwtMockService.signAsync.mockResolvedValue('new-token');

      drizzleMock.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ id: 'token-id' }]),
        }),
      });

      drizzleMock.delete.mockReturnValueOnce({
        where: jest.fn().mockResolvedValue(undefined),
      });

      drizzleMock.insert.mockReturnValueOnce({
        values: jest.fn().mockResolvedValue(undefined),
      });

      const result = await service.regenerateToken('token');
      expect(result).toEqual({
        refreshToken: 'new-token',
        accessToken: 'new-token',
      });
      expect(jwtMockService.verifyAsync).toHaveBeenCalledWith('token', {
        secret: process.env.REFRESH_TOKEN_SECRET,
      });
    });

    it('should throw a BadRequestException on expired token', async () => {
      const date = new Date();
      jwtMockService.verifyAsync.mockRejectedValue(
        new TokenExpiredError('', date),
      );

      await expect(service.regenerateToken('token')).rejects.toThrow(
        'Refresh token expired',
      );
    });

    it('should throw a ForbiddenException on invalid token', async () => {
      jwtMockService.verifyAsync.mockRejectedValue(
        new JsonWebTokenError('Invalid token'),
      );

      await expect(service.regenerateToken('token')).rejects.toThrow(
        'Invalid JSON Web Token',
      );
    });

    it('should throw UnauthorizedException on unknown error', async () => {
      jwtMockService.verifyAsync.mockRejectedValue(new Error('Unknown error'));

      await expect(service.regenerateToken('token')).rejects.toThrow(
        'Unauthorized',
      );
    });
  });
});
