import { createHash } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AuthUserEntity } from './entities/auth-user.entity';
import { AuthRefreshTokenEntity } from './entities/auth-refresh-token.entity';
import { verifyPassword } from './password.util';

export interface JwtUser {
  sub: string;
  email: string;
  roles: string[];
  tokenType: 'access';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(AuthUserEntity)
    private readonly usersRepository: Repository<AuthUserEntity>,
    @InjectRepository(AuthRefreshTokenEntity)
    private readonly refreshTokensRepository: Repository<AuthRefreshTokenEntity>,
  ) {}

  async login(email: string, password: string) {
    const normalizedEmail = email.toLowerCase();
    const user = await this.usersRepository.findOne({
      where: {
        email: normalizedEmail,
        isActive: true,
      },
    });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    const payload = this.verifyRefreshToken(refreshToken);

    if (payload.tokenType !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = this.hashToken(refreshToken);
    const tokenRow = await this.refreshTokensRepository.findOne({
      where: {
        tokenHash,
        userId: payload.sub,
        revokedAt: IsNull(),
      },
    });

    if (!tokenRow || tokenRow.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    await this.refreshTokensRepository.update({ id: tokenRow.id }, { revokedAt: new Date() });

    const user = await this.usersRepository.findOne({
      where: {
        id: payload.sub,
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User is no longer active');
    }

    return this.issueTokens(user);
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const tokenRow = await this.refreshTokensRepository.findOne({
      where: {
        tokenHash,
        revokedAt: IsNull(),
      },
    });

    if (!tokenRow) {
      return { revoked: false };
    }

    await this.refreshTokensRepository.update({ id: tokenRow.id }, { revokedAt: new Date() });
    return { revoked: true };
  }

  async me(user: JwtUser) {
    const found = await this.usersRepository.findOne({
      where: { id: user.sub, isActive: true },
      select: {
        id: true,
        email: true,
        roles: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!found) {
      throw new UnauthorizedException('User not found');
    }

    return found;
  }

  signToken(user: JwtUser): string {
    return this.jwtService.sign(user);
  }

  private async issueTokens(user: AuthUserEntity) {
    const accessTtl = this.config.get<number>('JWT_EXPIRES_IN_SECONDS', 3600);
    const refreshTtl = this.config.get<number>('JWT_REFRESH_EXPIRES_IN_SECONDS', 604800);
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET', 'change-me-refresh');

    const basePayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    };

    const accessToken = this.jwtService.sign({
      ...basePayload,
      tokenType: 'access',
    });

    const refreshToken = this.jwtService.sign(
      {
        ...basePayload,
        tokenType: 'refresh',
      },
      {
        secret: refreshSecret,
        expiresIn: refreshTtl,
      },
    );

    await this.refreshTokensRepository.insert({
      userId: user.id,
      tokenHash: this.hashToken(refreshToken),
      expiresAt: new Date(Date.now() + refreshTtl * 1000),
      revokedAt: null,
    });

    return {
      tokenType: 'Bearer',
      accessToken,
      accessTokenExpiresIn: accessTtl,
      refreshToken,
      refreshTokenExpiresIn: refreshTtl,
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles,
      },
    };
  }

  private verifyRefreshToken(token: string): {
    sub: string;
    email: string;
    roles: string[];
    tokenType: 'refresh';
  } {
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET', 'change-me-refresh');

    try {
      return this.jwtService.verify(token, { secret: refreshSecret });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
