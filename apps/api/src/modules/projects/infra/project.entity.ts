import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'projects' })
export class ProjectEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 140 })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
