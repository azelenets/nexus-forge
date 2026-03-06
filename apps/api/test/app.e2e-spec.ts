import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { HealthCheckService, MemoryHealthIndicator, MicroserviceHealthIndicator, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { HealthController } from '../src/modules/health/health.controller';

describe('API endpoints (integration)', () => {
  let app: INestApplication;
  const authService = {
    login: jest.fn().mockResolvedValue({
      tokenType: 'Bearer',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    }),
    refresh: jest.fn().mockResolvedValue({
      tokenType: 'Bearer',
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    }),
    logout: jest.fn().mockResolvedValue({ revoked: true }),
    me: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController, AuthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: async (checks: (() => Promise<Record<string, unknown>>)[]) => ({
              status: 'ok',
              info: Object.assign({}, ...(await Promise.all(checks.map((check) => check())))),
              error: {},
              details: {},
            }),
          },
        },
        {
          provide: TypeOrmHealthIndicator,
          useValue: { pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }) },
        },
        {
          provide: MicroserviceHealthIndicator,
          useValue: { pingCheck: jest.fn().mockResolvedValue({ nats: { status: 'up' } }) },
        },
        {
          provide: MemoryHealthIndicator,
          useValue: { checkHeap: jest.fn().mockResolvedValue({ memory_heap: { status: 'up' } }) },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_key: string, fallback: string) => fallback) },
        },
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  it('/api/health (GET)', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('/api/auth/login (POST) returns tokens for valid payload', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@nexus.local', password: 'ChangeMe123!' })
      .expect(201);

    expect(res.body.accessToken).toBe('access-token');
    expect(authService.login).toHaveBeenCalledWith('admin@nexus.local', 'ChangeMe123!');
  });

  it('/api/auth/login (POST) validates payload', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);
  });

  it('/api/auth/refresh (POST) validates refresh token shape', async () => {
    await request(app.getHttpServer()).post('/api/auth/refresh').send({ refreshToken: 'too-short' }).expect(400);
  });

  it('/api/auth/logout (POST) delegates to auth service', async () => {
    const token = 'x'.repeat(20);
    const res = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .send({ refreshToken: token })
      .expect(201);

    expect(res.body).toEqual({ revoked: true });
    expect(authService.logout).toHaveBeenCalledWith(token);
  });

  afterAll(async () => {
    await app.close();
  });
});
