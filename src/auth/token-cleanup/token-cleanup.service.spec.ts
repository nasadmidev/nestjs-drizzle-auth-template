import { Test, TestingModule } from '@nestjs/testing';
import { TokenCleanupService } from './token-cleanup.service';
import { DrizzleService } from '@/db/drizzle.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

describe('TokenCleanupService', () => {
  let service: TokenCleanupService;
  let drizzleServiceMock: DeepMockProxy<DrizzleService>;

  beforeEach(async () => {
    drizzleServiceMock = mockDeep<DrizzleService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenCleanupService,
        {
          provide: DrizzleService,
          useValue: drizzleServiceMock,
        },
      ],
    }).compile();

    service = module.get<TokenCleanupService>(TokenCleanupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should delete expired tokens', async () => {
    drizzleServiceMock.execute.mockResolvedValue([{ id: 'token-1' }, { id: 'token-2' }]);

    await service.handleCron();
    expect(drizzleServiceMock.execute).toHaveBeenCalled();
  });
});
