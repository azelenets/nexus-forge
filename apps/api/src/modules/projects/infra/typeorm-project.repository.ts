import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ProjectAggregate } from '../domain/project.aggregate';
import { ProjectRepository } from '../domain/project.repository';
import { ProjectEntity } from './project.entity';

@Injectable()
export class TypeormProjectRepository implements ProjectRepository {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly repository: Repository<ProjectEntity>,
  ) {}

  async save(project: ProjectAggregate, manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(ProjectEntity) : this.repository;

    await repo.save({
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
    });
  }

  async findById(id: string): Promise<ProjectAggregate | null> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) {
      return null;
    }

    return ProjectAggregate.rehydrate(
      entity.id,
      entity.name,
      entity.description,
      entity.createdAt,
    );
  }
}
