import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthTokens1760000001000 implements MigrationInterface {
  name = 'AuthTokens1760000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "auth_users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying(320) NOT NULL,
        "password_hash" text NOT NULL,
        "roles" text array NOT NULL DEFAULT '{viewer}',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auth_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_auth_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "auth_refresh_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" character varying(64) NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "revoked_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auth_refresh_tokens_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_auth_refresh_tokens_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "FK_auth_refresh_tokens_user_id" FOREIGN KEY ("user_id")
          REFERENCES "auth_users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_auth_refresh_tokens_user_id"
      ON "auth_refresh_tokens" ("user_id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_auth_refresh_tokens_user_id"');
    await queryRunner.query('DROP TABLE IF EXISTS "auth_refresh_tokens"');
    await queryRunner.query('DROP TABLE IF EXISTS "auth_users"');
  }
}
