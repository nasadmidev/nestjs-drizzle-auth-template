import { Test, TestingModule } from '@nestjs/testing';
import { AuthService, JwtPayload } from './auth.service';
import { UserService } from '@/user/user.service';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import bcrypt from 'bcrypt';
import { Role, User } from '@/db/schema';

describe('AuthService', () => {
  let service: AuthService;
  let userMockService: DeepMockProxy<UserService>;
  let jwtMockService: DeepMockProxy<JwtService>;

  beforeEach(async () => {
    userMockService = mockDeep<UserService>();
    jwtMockService = mockDeep<JwtService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userMockService },
        { provide: JwtService, useValue: jwtMockService },
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
      expect(result).toBe('jwt-token');
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
      username: 'test',
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
      const result = await service.regenerateToken('token');
      expect(result).toBe('new-token');
      expect(jwtMockService.verifyAsync).toHaveBeenCalledWith('token');
      expect(jwtMockService.signAsync).toHaveBeenCalledWith(payloadData);
    });

    it('should throw a ForbiddenException', async () => {
      const date = new Date();
      jwtMockService.verifyAsync.mockRejectedValue(
        new TokenExpiredError('', date),
      );

      await expect(service.regenerateToken('token')).rejects.toThrow(
        `Token expired: ${date.toISOString()}`,
      );
    });

    it('should return null on non-jwt error', async () => {
      jwtMockService.verifyAsync.mockRejectedValue(new Error('Unknown error'));
      const result = await service.regenerateToken('token');
      expect(result).toBe(null);
    });
  });
});
