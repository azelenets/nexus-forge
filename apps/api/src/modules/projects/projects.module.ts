import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { ProjectsController } from './projects.controller';
import { ProjectEntity } from './infra/project.entity';
import { CreateProjectHandler } from './commands/create-project.handler';
import { GetProjectByIdHandler } from './queries/get-project-by-id.handler';
import { PROJECT_REPOSITORY } from './domain/project.repository';
import { TypeormProjectRepository } from './infra/typeorm-project.repository';
import { OutboxEventEntity } from './outbox/outbox-event.entity';
import { OutboxDeadLetterEntity } from './outbox/outbox-dead-letter.entity';
import { OutboxRepository } from './outbox/outbox.repository';
import { OutboxPublisher } from './outbox/outbox.publisher';
import { ProjectWriteService } from './project-write.service';
import { OutboxAdminService } from './outbox/outbox-admin.service';
import { OutboxAdminController } from './outbox/outbox-admin.controller';
import { ProjectsJobsModule } from './jobs/projects-jobs.module';

const CommandHandlers = [CreateProjectHandler];
const QueryHandlers = [GetProjectByIdHandler];

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([ProjectEntity, OutboxEventEntity, OutboxDeadLetterEntity]), ProjectsJobsModule],
  controllers: [ProjectsController, OutboxAdminController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    ProjectWriteService,
    OutboxRepository,
    OutboxPublisher,
    OutboxAdminService,
    {
      provide: PROJECT_REPOSITORY,
      useClass: TypeormProjectRepository,
    },
  ],
})
export class ProjectsModule {}
