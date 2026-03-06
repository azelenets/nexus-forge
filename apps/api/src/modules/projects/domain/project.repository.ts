import type { EntityManager } from 'typeorm';
import type { ProjectAggregate } from './project.aggregate';

export const PROJECT_REPOSITORY = Symbol('PROJECT_REPOSITORY');

export interface ProjectRepository {
  save(project: ProjectAggregate, manager?: EntityManager): Promise<void>;
  findById(id: string): Promise<ProjectAggregate | null>;
}
