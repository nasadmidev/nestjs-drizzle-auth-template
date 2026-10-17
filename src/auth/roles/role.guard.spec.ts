import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { RolesGuard } from './role.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common/interfaces/features/execution-context.interface';
import { Role } from '@/db/schema';

describe('RolesGuard', () => {
  const reflectorMock: DeepMockProxy<Reflector> = mockDeep<Reflector>();

  it('should be defined', () => {
    expect(new RolesGuard(reflectorMock)).toBeDefined();
  });

  const createContext = (
    role: Role = Role['USER'],
  ): Pick<ExecutionContext, 'getHandler' | 'getClass' | 'switchToHttp'> =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: role },
        }),
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    }) as Pick<ExecutionContext, 'getHandler' | 'getClass' | 'switchToHttp'>;

  it('should return true if no roles are required', () => {
    reflectorMock.getAllAndOverride.mockReturnValue(undefined);
    const guard = new RolesGuard(reflectorMock);
    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('should return true if user has required role', () => {
    reflectorMock.getAllAndOverride.mockReturnValue([Role['USER']]);
    const guard = new RolesGuard(reflectorMock);
    expect(guard.canActivate(createContext(Role['USER']))).toBe(true);
  });

  it('should return false if user does not have required role', () => {
    reflectorMock.getAllAndOverride.mockReturnValue([Role['ADMIN']]);
    const guard = new RolesGuard(reflectorMock);
    expect(guard.canActivate(createContext(Role['USER']))).toBe(false);
  });
});
