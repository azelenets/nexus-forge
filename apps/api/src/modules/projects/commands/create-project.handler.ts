import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'node:crypto';
import { CreateProjectCommand } from './create-project.command';
import { ProjectAggregate } from '../domain/project.aggregate';
import { ProjectWriteService } from '../project-write.service';

@CommandHandler(CreateProjectCommand)
export class CreateProjectHandler implements ICommandHandler<CreateProjectCommand, string> {
  constructor(private readonly projectWriteService: ProjectWriteService) {}

  async execute(command: CreateProjectCommand): Promise<string> {
    const id = randomUUID();
    const aggregate = ProjectAggregate.create(id, command.name, command.description);

    await this.projectWriteService.createProject(aggregate);

    return id;
  }
}
