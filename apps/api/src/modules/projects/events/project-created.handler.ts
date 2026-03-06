import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { ProjectCreatedEvent } from './project-created.event';

@EventsHandler(ProjectCreatedEvent)
export class ProjectCreatedHandler implements IEventHandler<ProjectCreatedEvent> {
  private readonly logger = new Logger(ProjectCreatedHandler.name);

  handle(event: ProjectCreatedEvent): void {
    this.logger.log(`Project created: ${event.projectId} (${event.name})`);
  }
}
