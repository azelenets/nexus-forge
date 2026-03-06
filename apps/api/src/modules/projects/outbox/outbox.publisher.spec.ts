import type { ConfigService } from '@nestjs/config';
import type { ClientProxy } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import type { DataSource } from 'typeorm';
import { OutboxPublisher } from './outbox.publisher';

describe('OutboxPublisher', () => {
  function makeQueryRunner(rows: any[], failUpdate = false) {
    const query = jest.fn(async (sql: string, _params?: unknown[]) => {
      if (sql.includes('SELECT id, event_name')) {
        return rows;
      }

      if (failUpdate && sql.includes("UPDATE outbox_events SET status='processing'")) {
        throw new Error('update failed');
      }

      return [];
    });

    return {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      query,
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
    };
  }

  it('marks row processed when publish succeeds', async () => {
    const queryRunner = makeQueryRunner([
      { id: 'e1', event_name: 'projects.created.v1', aggregate_id: 'a1', payload: { a: 1 }, attempts: 0 },
    ]);

    const dataSource = { createQueryRunner: jest.fn(() => queryRunner) } as unknown as DataSource;
    const config = { get: jest.fn((k: string, fallback: number) => (k === 'OUTBOX_MAX_ATTEMPTS' ? 5 : fallback)) } as unknown as ConfigService;
    const natsClient = { emit: jest.fn(() => of(true)) } as unknown as ClientProxy;

    const publisher = new OutboxPublisher(dataSource, config, natsClient);

    await (publisher as any).publishBatch(10);

    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    expect(queryRunner.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE outbox_events SET status='processed'"),
      ['e1'],
    );
  });

  it('marks row as failed when publish fails but attempts are below max', async () => {
    const queryRunner = makeQueryRunner([
      { id: 'e1', event_name: 'projects.created.v1', aggregate_id: 'a1', payload: { a: 1 }, attempts: 1 },
    ]);

    const dataSource = { createQueryRunner: jest.fn(() => queryRunner) } as unknown as DataSource;
    const config = { get: jest.fn((k: string, fallback: number) => (k === 'OUTBOX_MAX_ATTEMPTS' ? 5 : fallback)) } as unknown as ConfigService;
    const natsClient = { emit: jest.fn(() => throwError(() => new Error('nats transient'))) } as unknown as ClientProxy;

    const publisher = new OutboxPublisher(dataSource, config, natsClient);

    await (publisher as any).publishBatch(10);

    expect(queryRunner.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE outbox_events SET status='failed'"),
      ['e1', 'nats transient'],
    );
  });

  it('moves row to deadletter when max attempts reached', async () => {
    const queryRunner = makeQueryRunner([
      { id: 'e1', event_name: 'projects.created.v1', aggregate_id: 'a1', payload: { a: 1 }, attempts: 4 },
    ]);

    const dataSource = { createQueryRunner: jest.fn(() => queryRunner) } as unknown as DataSource;
    const config = { get: jest.fn((k: string, fallback: number) => (k === 'OUTBOX_MAX_ATTEMPTS' ? 5 : fallback)) } as unknown as ConfigService;
    const natsClient = { emit: jest.fn(() => throwError(() => new Error('nats down'))) } as unknown as ClientProxy;

    const publisher = new OutboxPublisher(dataSource, config, natsClient);

    await (publisher as any).publishBatch(10);

    expect(queryRunner.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO outbox_dead_letters'),
      expect.arrayContaining(['projects.created.v1', 'a1']),
    );
    expect(queryRunner.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE outbox_events SET status='deadletter'"),
      ['e1', 'nats down'],
    );
  });

  it('rolls back transaction on unexpected batch error', async () => {
    const queryRunner = makeQueryRunner([]);
    queryRunner.query = jest.fn().mockRejectedValue(new Error('select failed'));
    const dataSource = { createQueryRunner: jest.fn(() => queryRunner) } as unknown as DataSource;
    const config = { get: jest.fn((_k: string, fallback: number) => fallback) } as unknown as ConfigService;
    const natsClient = { emit: jest.fn(() => of(true)) } as unknown as ClientProxy;

    const publisher = new OutboxPublisher(dataSource, config, natsClient);

    await (publisher as any).publishBatch(10);

    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });

  it('starts and stops polling timer with lifecycle hooks', () => {
    jest.useFakeTimers();
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    const queryRunner = makeQueryRunner([]);
    const dataSource = { createQueryRunner: jest.fn(() => queryRunner) } as unknown as DataSource;
    const config = { get: jest.fn((k: string, fallback: number) => (k === 'OUTBOX_POLL_INTERVAL_MS' ? 1000 : fallback)) } as unknown as ConfigService;
    const natsClient = { emit: jest.fn(() => of(true)) } as unknown as ClientProxy;

    const publisher = new OutboxPublisher(dataSource, config, natsClient);
    const publishSpy = jest.spyOn(publisher as any, 'publishBatch').mockResolvedValue(undefined);

    publisher.onModuleInit();
    jest.advanceTimersByTime(1000);
    expect(setIntervalSpy).toHaveBeenCalled();
    expect(publishSpy).toHaveBeenCalled();

    publisher.onModuleDestroy();
    expect(clearIntervalSpy).toHaveBeenCalled();

    jest.useRealTimers();
    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });
});
