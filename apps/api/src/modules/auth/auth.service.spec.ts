import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import type { Repository } from 'typeorm';
import type { AuthRefreshTokenEntity } from './entities/auth-refresh-token.entity';
import type { AuthUserEntity } from './entities/auth-user.entity';
import { AuthService } from './auth.service';
import { hashPassword } from './password.util';

describe('AuthService', () => {
  const now = new Date('2026-03-06T00:00:00.000Z');
  const baseUser: AuthUserEntity = {
    id: 'user-1',
    email: 'admin@nexus.local',
    passwordHash: hashPassword('ChangeMe123!'),
    roles: ['admin'],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  function makeService() {
    const jwtService = {
      sign: jest.fn((payload: any) => (payload.tokenType === 'refresh' ? 'refresh-token' : 'access-token')),
      verify: jest.fn(),
    } as unknown as JwtService;

    const config = {
      get: jest.fn((key: string, fallback?: any) => {
        const values: Record<string, any> = {
          JWT_EXPIRES_IN_SECONDS: 3600,
          JWT_REFRESH_EXPIRES_IN_SECONDS: 7200,
          JWT_REFRESH_SECRET: 'refresh-secret',
        };
        return key in values ? values[key] : fallback;
      }),
    } as unknown as ConfigService;

    const usersRepository = {
      findOne: jest.fn(),
    } as unknown as Repository<AuthUserEntity>;

    const refreshTokensRepository = {
      findOne: jest.fn(),
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
    } as unknown as Repository<AuthRefreshTokenEntity>;

    return {
      service: new AuthService(jwtService, config, usersRepository, refreshTokensRepository),
      jwtService,
      usersRepository,
      refreshTokensRepository,
    };
  }

  it('logs in valid user and returns token payload', async () => {
    const ctx = makeService();
    (ctx.usersRepository.findOne as jest.Mock).mockResolvedValue(baseUser);

    const result = await ctx.service.login('ADMIN@NEXUS.LOCAL', 'ChangeMe123!');

    expect(ctx.usersRepository.findOne).toHaveBeenCalledWith({
      where: { email: 'admin@nexus.local', isActive: true },
    });
    expect(ctx.refreshTokensRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', revokedAt: null, expiresAt: expect.any(Date) }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        tokenType: 'Bearer',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: 'user-1', email: 'admin@nexus.local', roles: ['admin'] },
      }),
    );
  });

  it('rejects invalid credentials', async () => {
    const ctx = makeService();
    (ctx.usersRepository.findOne as jest.Mock).mockResolvedValue(baseUser);

    await expect(ctx.service.login('admin@nexus.local', 'wrong')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refreshes token and rotates existing token', async () => {
    const ctx = makeService();
    (ctx.jwtService.verify as jest.Mock).mockReturnValue({
      sub: 'user-1',
      email: 'admin@nexus.local',
      roles: ['admin'],
      tokenType: 'refresh',
    });

    (ctx.refreshTokensRepository.findOne as jest.Mock).mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 5000),
      revokedAt: null,
    });

    (ctx.usersRepository.findOne as jest.Mock).mockResolvedValue(baseUser);

    const result = await ctx.service.refresh('refresh-token');

    expect(ctx.refreshTokensRepository.update).toHaveBeenCalledWith({ id: 'rt-1' }, { revokedAt: expect.any(Date) });
    expect(ctx.refreshTokensRepository.insert).toHaveBeenCalledTimes(1);
    expect(result.accessToken).toBe('access-token');
  });

  it('rejects refresh token with wrong tokenType', async () => {
    const ctx = makeService();
    (ctx.jwtService.verify as jest.Mock).mockReturnValue({ tokenType: 'access' });

    await expect(ctx.service.refresh('token')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects refresh token when db token row is missing', async () => {
    const ctx = makeService();
    (ctx.jwtService.verify as jest.Mock).mockReturnValue({ sub: 'user-1', tokenType: 'refresh' });
    (ctx.refreshTokensRepository.findOne as jest.Mock).mockResolvedValue(null);

    await expect(ctx.service.refresh('token')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns revoked false on logout when token missing', async () => {
    const ctx = makeService();
    (ctx.refreshTokensRepository.findOne as jest.Mock).mockResolvedValue(null);

    await expect(ctx.service.logout('token')).resolves.toEqual({ revoked: false });
  });

  it('revokes token on logout when token exists', async () => {
    const ctx = makeService();
    (ctx.refreshTokensRepository.findOne as jest.Mock).mockResolvedValue({ id: 'rt-2' });

    await expect(ctx.service.logout('token')).resolves.toEqual({ revoked: true });
    expect(ctx.refreshTokensRepository.update).toHaveBeenCalledWith({ id: 'rt-2' }, { revokedAt: expect.any(Date) });
  });

  it('returns current user profile for me()', async () => {
    const ctx = makeService();
    (ctx.usersRepository.findOne as jest.Mock).mockResolvedValue({ id: 'u1', email: 'a@b.com' });

    await expect(
      ctx.service.me({ sub: 'u1', email: 'a@b.com', roles: ['admin'], tokenType: 'access' }),
    ).resolves.toEqual({ id: 'u1', email: 'a@b.com' });
  });

  it('throws for me() when user not found', async () => {
    const ctx = makeService();
    (ctx.usersRepository.findOne as jest.Mock).mockResolvedValue(null);

    await expect(
      ctx.service.me({ sub: 'u1', email: 'a@b.com', roles: ['admin'], tokenType: 'access' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
