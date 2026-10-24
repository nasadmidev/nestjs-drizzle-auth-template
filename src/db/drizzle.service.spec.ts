/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { DrizzleService } from './drizzle.service';
import { getDrizzleToken } from '@nestjs/drizzle';
import { DrizzleException } from './drizzle-exception/drizzle.exception';

describe('DrizzleService', () => {
  let service: DrizzleService;
  let drizzleMock: jest.Mocked<any>;

  beforeEach(async () => {
    drizzleMock = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DrizzleService,
        {
          provide: getDrizzleToken(),
          useValue: drizzleMock,
        },
      ],
    }).compile();

    service = module.get<DrizzleService>(DrizzleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should execute operation successfully', async () => {
    const mockResult = [{ id: '1', name: 'test' }];
    drizzleMock.select.mockResolvedValue(mockResult);

    const result = await service.execute(async (db) => {
      return await db.select();
    });

    expect(result).toEqual(mockResult);
    expect(drizzleMock.select).toHaveBeenCalled();
  });

  it('should wrap Drizzle errors in DrizzleException', async () => {
    const pgError = {
      code: '23505',
      message: 'duplicate key value violates unique constraint',
    };
    const drizzleError = {
      cause: pgError,
      message: 'Failed query',
    };
    drizzleMock.select.mockRejectedValue(drizzleError);

    await expect(
      service.execute(async (db) => {
        return await db.select();
      }),
    ).rejects.toThrow(DrizzleException);

    try {
      await service.execute(async (db) => {
        return await db.select();
      });
    } catch (e) {
      expect(e).toBeInstanceOf(DrizzleException);
      if (e instanceof DrizzleException) {
        expect(e.code).toBe('23505');
        expect(e.message).toBe(
          'duplicate key value violates unique constraint',
        );
      }
    }
  });

  it('should wrap errors without code in DrizzleException', async () => {
    const genericError = new Error('Generic error');
    drizzleMock.select.mockRejectedValue(genericError);

    await expect(
      service.execute(async (db) => {
        return await db.select();
      }),
    ).rejects.toThrow(DrizzleException);
  });
});
