import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { ProjectsController } from './projects.controller';
import { ProjectEntity } from './infra/project.entity';
import { CreateProjectHandler } from './commands/create-project.handler';
import { GetProjectByIdHandler } from './queries/get-project-by-id.handler';
import { ProjectCreatedHandler } from './events/project-created.handler';
import { PROJECT_REPOSITORY } from './domain/project.repository';
import { TypeormProjectRepository } from './infra/typeorm-project.repository';
import { ProjectWriteService } from './project-write.service';
import { OutboxModule } from './outbox/outbox.module';
import { ProjectsJobsModule } from './jobs/projects-jobs.module';

const CommandHandlers = [CreateProjectHandler];
const QueryHandlers = [GetProjectByIdHandler];
const EventHandlers = [ProjectCreatedHandler];

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([ProjectEntity]), OutboxModule, ProjectsJobsModule],
  controllers: [ProjectsController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
    ProjectWriteService,
    {
      provide: PROJECT_REPOSITORY,
      useClass: TypeormProjectRepository,
    },
  ],
})
export class ProjectsModule {}
