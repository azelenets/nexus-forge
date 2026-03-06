import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const config = {
    get: jest.fn((key: string, fallback: string) => (key === 'JWT_SECRET' ? 'secret' : fallback)),
  } as unknown as ConfigService;

  it('returns payload for access token', () => {
    const strategy = new JwtStrategy(config);
    const payload = { sub: 'u1', email: 'a@b.com', roles: ['admin'], tokenType: 'access' as const };

    expect(strategy.validate(payload)).toEqual(payload);
  });

  it('throws for non-access token', () => {
    const strategy = new JwtStrategy(config);

    expect(() => strategy.validate({ sub: 'u1', email: 'a@b.com', roles: [], tokenType: 'refresh' as never })).toThrow(
      UnauthorizedException,
    );
  });
});
