import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import { Role } from '@/db/schema';
import { DrizzleService } from '@/db/drizzle.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

describe('UserService', () => {
  let service: UserService;
  let drizzleServiceMock: DeepMockProxy<DrizzleService>;

  beforeEach(async () => {
    drizzleServiceMock = mockDeep<DrizzleService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: DrizzleService,
          useValue: drizzleServiceMock,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
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
    drizzleServiceMock.execute.mockResolvedValue([user]);

    const result = await service.findAll();
    expect(result).toEqual([user]);
    expect(drizzleServiceMock.execute).toHaveBeenCalled();
  });

  it('should find one user', async () => {
    drizzleServiceMock.execute.mockResolvedValue([user]);

    const result = await service.findOne(id);
    expect(result).toEqual([user]);
    expect(drizzleServiceMock.execute).toHaveBeenCalled();
  });

  it('should find one user by email', async () => {
    drizzleServiceMock.execute.mockResolvedValue([user]);

    const result = await service.findOneByEmail(user.email);
    expect(result).toEqual([user]);
    expect(drizzleServiceMock.execute).toHaveBeenCalled();
  });

  it('should throw an error for invalid UUID', async () => {
    const invalidId = 'invalid-uuid';
    await expect(service.findOne(invalidId)).rejects.toThrow('Invalid UUID');
    expect(drizzleServiceMock.execute).not.toHaveBeenCalled();
  });

  it('should create a user', async () => {
    const spyHash = jest
      .spyOn(bcrypt, 'hash')
      .mockResolvedValue('hashed-password' as never);

    drizzleServiceMock.execute.mockResolvedValue([user]);

    const result = await service.create(createUser);
    expect(result).toEqual([user]);
    expect(drizzleServiceMock.execute).toHaveBeenCalled();
    expect(spyHash).toHaveBeenCalledWith(createUser.password, 12);
  });

  it('should delete a user', async () => {
    drizzleServiceMock.execute.mockResolvedValue([user]);

    const result = await service.delete(id);
    expect(result).toEqual([user]);
    expect(drizzleServiceMock.execute).toHaveBeenCalled();
  });

  it('should update a user', async () => {
    const updateData = { email: 'jane@doe.com' };
    const updatedUser = { ...user, ...updateData };

    drizzleServiceMock.execute.mockResolvedValue([updatedUser]);

    const result = await service.update(id, updateData);
    expect(result).toEqual([updatedUser]);
    expect(drizzleServiceMock.execute).toHaveBeenCalled();
  });
});
