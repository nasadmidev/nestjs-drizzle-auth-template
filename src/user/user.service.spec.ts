import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import { Role } from '@/db/schema';
import { getDrizzleToken } from '@nestjs/drizzle';

describe('UserService', () => {
  let service: UserService;
  let drizzleMock: { [k: string]: jest.Mock };

  beforeEach(async () => {
    drizzleMock = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getDrizzleToken(),
          useValue: drizzleMock,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const id = randomUUID();

  const createUser = {
    email: 'john.doe@example.com',
    password: 'hashed-password',
    role: Role['USER'],
  };

  const user = {
    id,
    ...createUser,
    createdAt: new Date(),
  };

  it('should find all users', async () => {
    // Drizzle: db.select().from(users)
    drizzleMock.select.mockReturnValueOnce({
      from: jest.fn().mockResolvedValue([user]),
    });

    const result = await service.findAll();
    expect(result).toEqual([user]);
    expect(drizzleMock.select).toHaveBeenCalled();
  });

  it('should find one user', async () => {
    // Drizzle: db.select().from(users).where(...)
    drizzleMock.select.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([user]),
      }),
    });

    const result = await service.findOne(id);
    expect(result).toEqual([user]);
    expect(drizzleMock.select).toHaveBeenCalled();
  });

  it('should find one user by email', async () => {
    drizzleMock.select.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([user]),
      }),
    });

    const result = await service.findOneByEmail(user.email);
    expect(result).toEqual([user]);
    expect(drizzleMock.select).toHaveBeenCalled();
  });

  it('should throw an error for invalid UUID', async () => {
    const invalidId = 'invalid-uuid';
    await expect(service.findOne(invalidId)).rejects.toThrow('Invalid UUID');
    expect(drizzleMock.select).not.toHaveBeenCalled();
  });

  it('should create a user', async () => {
    const spyHash = jest
      .spyOn(bcrypt, 'hash')
      .mockResolvedValue('hashed-password' as never);

    // Drizzle: db.insert(users).values(...).returning()
    drizzleMock.insert.mockReturnValueOnce({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([user]),
      }),
    });

    const result = await service.create(createUser);
    expect(result).toEqual([user]);
    expect(drizzleMock.insert).toHaveBeenCalled();
    expect(spyHash).toHaveBeenCalledWith(createUser.password, 12);
  });

  it('should delete a user', async () => {
    // Drizzle: db.delete(users).where(...).returning()
    drizzleMock.delete.mockReturnValueOnce({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([user]),
      }),
    });

    const result = await service.delete(id);
    expect(result).toEqual([user]);
    expect(drizzleMock.delete).toHaveBeenCalled();
  });

  it('should update a user', async () => {
    const updateData = { email: 'jane@doe.com' };
    const updatedUser = { ...user, ...updateData };

    // Drizzle: db.update(users).set(...).where(...).returning()
    drizzleMock.update.mockReturnValueOnce({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([updatedUser]),
        }),
      }),
    });

    const result = await service.update(id, updateData);
    expect(result).toEqual([updatedUser]);
    expect(drizzleMock.update).toHaveBeenCalled();
  });
});
