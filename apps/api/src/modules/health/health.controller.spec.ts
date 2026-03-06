import { HealthController } from './health.controller';
import type { ConfigService } from '@nestjs/config';
import type { MicroserviceHealthIndicator, HealthCheckService, MemoryHealthIndicator, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { Transport } from '@nestjs/microservices';

describe('HealthController', () => {
  it('runs db, nats and memory health checks', async () => {
    const typeOrm = {
      pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
    } as unknown as TypeOrmHealthIndicator;
    const microservice = {
      pingCheck: jest.fn().mockResolvedValue({ nats: { status: 'up' } }),
    } as unknown as MicroserviceHealthIndicator;
    const memory = {
      checkHeap: jest.fn().mockResolvedValue({ memory_heap: { status: 'up' } }),
    } as unknown as MemoryHealthIndicator;
    const config = {
      get: jest.fn((_key: string, fallback: string) => fallback),
    } as unknown as ConfigService;

    const health = {
      check: jest.fn(async (checks: (() => Promise<Record<string, unknown>>)[]) => {
        const details = await Promise.all(checks.map((check) => check()));
        return {
          status: 'ok',
          info: Object.assign({}, ...details),
        };
      }),
    } as unknown as HealthCheckService;

    const controller = new HealthController(health, typeOrm, microservice, memory, config);
    const result = await controller.getHealth();

    expect(health.check).toHaveBeenCalledTimes(1);
    expect(typeOrm.pingCheck).toHaveBeenCalledWith('database');
    expect(microservice.pingCheck).toHaveBeenCalledWith('nats', {
      transport: Transport.NATS,
      options: { servers: ['nats://localhost:4222'] },
    });
    expect(memory.checkHeap).toHaveBeenCalledWith('memory_heap', 300 * 1024 * 1024);
    expect(result.status).toBe('ok');
  });
});
