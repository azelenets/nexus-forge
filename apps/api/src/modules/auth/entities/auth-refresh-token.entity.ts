import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AuthUserEntity } from './auth-user.entity';

@Entity({ name: 'auth_refresh_tokens' })
export class AuthRefreshTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index('IDX_auth_refresh_tokens_user_id')
  userId!: string;

  @ManyToOne(() => AuthUserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: AuthUserEntity;

  @Column({ name: 'token_hash', type: 'varchar', length: 64, unique: true })
  @Index('UQ_auth_refresh_tokens_token_hash', { unique: true })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
