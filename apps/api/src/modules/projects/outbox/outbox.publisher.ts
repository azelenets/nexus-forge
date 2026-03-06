import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { DataSource } from 'typeorm';
import { lastValueFrom } from 'rxjs';

interface OutboxRow {
  id: string;
  event_name: string;
  aggregate_id: string;
  payload: Record<string, unknown>;
  attempts: number;
}

@Injectable()
export class OutboxPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisher.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    @Inject('NATS_CLIENT') private readonly natsClient: ClientProxy,
  ) {}

  onModuleInit(): void {
    const intervalMs = this.config.get<number>('OUTBOX_POLL_INTERVAL_MS', 1500);
    this.timer = setInterval(() => {
      void this.publishBatch();
    }, intervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async publishBatch(batchSize = 25): Promise<void> {
    const maxAttempts = this.config.get<number>('OUTBOX_MAX_ATTEMPTS', 5);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      const rows = (await queryRunner.query(
        `
        SELECT id, event_name, aggregate_id, payload, attempts
        FROM outbox_events
        WHERE status IN ('pending', 'failed')
        ORDER BY created_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      `,
        [batchSize],
      )) as OutboxRow[];

      for (const row of rows) {
        const nextAttempts = row.attempts + 1;

        try {
          await queryRunner.query(
            `UPDATE outbox_events SET status='processing', attempts=$2, updated_at=NOW() WHERE id=$1`,
            [row.id, nextAttempts],
          );

          await lastValueFrom(this.natsClient.emit(row.event_name, row.payload));

          await queryRunner.query(
            `UPDATE outbox_events SET status='processed', processed_at=NOW(), last_error=NULL, updated_at=NOW() WHERE id=$1`,
            [row.id],
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : 'unknown outbox publishing error';
          const clippedMessage = message.slice(0, 1500);

          if (nextAttempts >= maxAttempts) {
            await queryRunner.query(
              `
              INSERT INTO outbox_dead_letters
                (event_name, aggregate_id, payload, attempts, error_message, origin_event_id, replayed_at, created_at)
              VALUES
                ($1, $2, $3, $4, $5, $6, NULL, NOW())
              `,
              [row.event_name, row.aggregate_id, row.payload, nextAttempts, clippedMessage, row.id],
            );

            await queryRunner.query(
              `UPDATE outbox_events SET status='deadletter', last_error=$2, updated_at=NOW() WHERE id=$1`,
              [row.id, clippedMessage],
            );

            this.logger.error(
              `Outbox event ${row.id} moved to DLQ after ${nextAttempts} attempts: ${clippedMessage}`,
            );
          } else {
            await queryRunner.query(
              `UPDATE outbox_events SET status='failed', last_error=$2, updated_at=NOW() WHERE id=$1`,
              [row.id, clippedMessage],
            );
            this.logger.warn(`Outbox publish failed for ${row.id}: ${clippedMessage}`);
          }
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Outbox batch transaction failed', error as Error);
    } finally {
      await queryRunner.release();
    }
  }
}
