import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { UserService } from './user.service';
import { JwtGuard } from '@/auth/jwt/jwt.guard';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@/db/schema';
import { RolesGuard } from '@/auth/roles/role.guard';
import { RequestAuthorized } from '@/auth/auth.service';

describe('UserController', () => {
  let controller: UserController;
  let userServiceMock: DeepMockProxy<UserService>;

  beforeEach(async () => {
    userServiceMock = mockDeep<UserService>();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: userServiceMock,
        },
        {
          provide: JwtGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
          },
        },
        JwtService,
        {
          provide: RolesGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('admin operations', () => {
    const mockUser: User = {
      id: '1',
      email: 'test@example.com',
      password: 'hashedpassword',
      role: Role['ADMIN'],
      createdAt: new Date(),
    };

    const mockUserWithoutPassword = {
      id: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
      createdAt: mockUser.createdAt,
    };

    it('should return all users for admin', async () => {
      const mockUsers: User[] = [mockUser, mockUser];
      userServiceMock.findAll.mockResolvedValue(mockUsers);
      const result = await controller.getAllUsers();
      expect(result).toEqual(mockUsers);
    });

    it('should return user by id for admin', async () => {
      userServiceMock.findOne.mockResolvedValue([mockUser]);
      const result = await controller.getUserById('1');
      expect(result).toEqual(mockUserWithoutPassword);
    });

    it('should create a new user', async () => {
      const createUserDTO = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password',
        role: Role['USER'],
      };
      const createdUser = { ...mockUser, ...createUserDTO, id: '2' };
      const createdUserWithoutPassword = {
        id: createdUser.id,
        email: createdUser.email,
        role: createdUser.role,
        createdAt: createdUser.createdAt,
      };
      userServiceMock.create.mockResolvedValue([createdUser]);
      const result = await controller.createUser(createUserDTO);
      expect(result).toEqual(createdUserWithoutPassword);
    });

    it('should update user by id for admin', async () => {
      const updateUserDTO = {
        email: 'jane@doe.com',
      };
      const updatedUser = { ...mockUser, ...updateUserDTO };
      const updatedUserWithoutPassword = {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt,
      };
      userServiceMock.update.mockResolvedValue([updatedUser]);
      const result = await controller.updateUserById('1', updateUserDTO);
      expect(result).toEqual(updatedUserWithoutPassword);
    });

    it('should delete user by id for admin', async () => {
      userServiceMock.delete.mockResolvedValue([mockUser]);
      const result = await controller.deleteUserById('1');
      expect(result).toEqual({ id: mockUser.id, email: mockUser.email });
    });
  });

  describe('user operations', () => {
    const mockUser: User = {
      id: '1',
      email: 'test@example.com',
      password: 'hashedpassword',
      role: Role['USER'],
      createdAt: new Date(),
    };

    const mockUserWithoutPassword = {
      id: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
      createdAt: mockUser.createdAt,
    };

    it('should return user data for authenticated user', async () => {
      userServiceMock.findOne.mockResolvedValue([mockUser]);
      const req = { user: { sub: '1' } } as RequestAuthorized;
      const result = await controller.getUser(req);
      expect(result).toEqual(mockUserWithoutPassword);
    });

    it('should update user data for authenticated user', async () => {
      const updateUserDTO = {
        email: 'jane@doe.com',
      };
      const updatedUser = { ...mockUser, ...updateUserDTO };
      const updatedUserWithoutPassword = {
        id: updatedUser.id,
        email: updatedUser.email,
        createdAt: updatedUser.createdAt,
      };
      userServiceMock.update.mockResolvedValue([updatedUser]);
      const req = { user: { sub: '1' } } as RequestAuthorized;
      const result = await controller.updateUser(req, updateUserDTO);
      expect(result).toEqual(updatedUserWithoutPassword);
    });

    it('should delete user for authenticated user', async () => {
      userServiceMock.delete.mockResolvedValue([mockUser]);
      const req = { user: { sub: '1' } } as RequestAuthorized;
      const result = await controller.deleteUser(req);
      expect(result).toEqual({ id: mockUser.id, email: mockUser.email });
    });
  });
});
