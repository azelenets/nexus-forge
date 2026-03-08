import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'node:crypto';
import { CreateProjectCommand } from './create-project.command';
import { ProjectAggregate } from '../domain/project.aggregate';
import { ProjectCreatedEvent } from '../events/project-created.event';
import { ProjectWriteService } from '../project-write.service';

@CommandHandler(CreateProjectCommand)
export class CreateProjectHandler implements ICommandHandler<CreateProjectCommand, string> {
  constructor(
    private readonly publisher: EventPublisher,
    private readonly projectWriteService: ProjectWriteService,
  ) {}

  async execute(command: CreateProjectCommand): Promise<string> {
    const id = randomUUID();
    const aggregate = this.publisher.mergeObjectContext(
      ProjectAggregate.create(id, command.name, command.description),
    );

    aggregate.apply(new ProjectCreatedEvent(id, command.name, aggregate.createdAt));

    await this.projectWriteService.createProject(aggregate);

    aggregate.commit();

    return id;
  }
}
