import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetProjectByIdQuery } from './get-project-by-id.query';
import { PROJECT_REPOSITORY, ProjectRepository } from '../domain/project.repository';

@QueryHandler(GetProjectByIdQuery)
export class GetProjectByIdHandler implements IQueryHandler<GetProjectByIdQuery> {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly repository: ProjectRepository,
  ) {}

  execute(query: GetProjectByIdQuery) {
    return this.repository.findById(query.id);
  }
}
