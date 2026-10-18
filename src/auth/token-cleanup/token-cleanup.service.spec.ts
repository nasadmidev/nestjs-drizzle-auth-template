import { Test, TestingModule } from '@nestjs/testing';
import { TokenCleanupService } from './token-cleanup.service';
import { getDrizzleToken } from '@nestjs/drizzle';

describe('TokenCleanupService', () => {
  let service: TokenCleanupService;
  let drizzleMock: { [k: string]: jest.Mock };

  beforeEach(async () => {
    drizzleMock = {
      delete: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenCleanupService,
        {
          provide: getDrizzleToken(),
          useValue: drizzleMock,
        },
      ],
    }).compile();

    service = module.get<TokenCleanupService>(TokenCleanupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should delete expired tokens', async () => {
    await service.handleCron();
    expect(drizzleMock.delete).toHaveBeenCalled();
    expect(drizzleMock.where).toHaveBeenCalled();
  });
});
