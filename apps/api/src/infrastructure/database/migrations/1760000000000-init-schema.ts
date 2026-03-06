import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1760000000000 implements MigrationInterface {
  name = 'InitSchema1760000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "projects" (
        "id" uuid NOT NULL,
        "name" character varying(140) NOT NULL,
        "description" text NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL,
        CONSTRAINT "PK_projects_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "outbox_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "event_name" character varying(255) NOT NULL,
        "aggregate_id" uuid NOT NULL,
        "payload" jsonb NOT NULL,
        "status" character varying(24) NOT NULL DEFAULT 'pending',
        "attempts" integer NOT NULL DEFAULT 0,
        "last_error" text,
        "processed_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_outbox_events_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_outbox_events_status_created_at"
      ON "outbox_events" ("status", "created_at")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "outbox_dead_letters" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "event_name" character varying(255) NOT NULL,
        "aggregate_id" uuid NOT NULL,
        "payload" jsonb NOT NULL,
        "attempts" integer NOT NULL,
        "error_message" text NOT NULL,
        "origin_event_id" uuid NOT NULL,
        "replayed_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_outbox_dead_letters_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_outbox_dead_letters_created_at"
      ON "outbox_dead_letters" ("created_at")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_outbox_dead_letters_created_at"');
    await queryRunner.query('DROP TABLE IF EXISTS "outbox_dead_letters"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_outbox_events_status_created_at"');
    await queryRunner.query('DROP TABLE IF EXISTS "outbox_events"');
    await queryRunner.query('DROP TABLE IF EXISTS "projects"');
  }
}
