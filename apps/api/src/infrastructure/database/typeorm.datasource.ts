import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ProjectEntity } from '../../modules/projects/infra/project.entity';
import { OutboxEventEntity } from '../../modules/projects/outbox/outbox-event.entity';
import { OutboxDeadLetterEntity } from '../../modules/projects/outbox/outbox-dead-letter.entity';
import { AuthUserEntity } from '../../modules/auth/entities/auth-user.entity';
import { AuthRefreshTokenEntity } from '../../modules/auth/entities/auth-refresh-token.entity';

const port = Number(process.env.DB_PORT ?? 5432);

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port,
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'nexus_forge',
  synchronize: false,
  entities: [ProjectEntity, OutboxEventEntity, OutboxDeadLetterEntity, AuthUserEntity, AuthRefreshTokenEntity],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
});
