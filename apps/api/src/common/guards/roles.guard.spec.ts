import type { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function makeContext(roles?: string[]) {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user: roles ? { roles } : undefined }),
    }),
  } as any;
}

describe('RolesGuard', () => {
  it('allows when no roles are required', () => {
    const reflector = { getAllAndOverride: jest.fn(() => undefined) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(makeContext(['viewer']))).toBe(true);
  });

  it('allows when user has any required role', () => {
    const reflector = { getAllAndOverride: jest.fn(() => ['admin', 'operator']) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(makeContext(['viewer', 'operator']))).toBe(true);
  });

  it('denies when user has none of required roles', () => {
    const reflector = { getAllAndOverride: jest.fn(() => ['admin']) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(makeContext(['viewer']))).toBe(false);
  });
});
