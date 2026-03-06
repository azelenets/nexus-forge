import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PROJECTS_QUEUE } from './projects-jobs.constants';
import { ProjectsJobsService } from './projects-jobs.service';
import { ProjectsCreatedProcessor } from './projects-created.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: PROJECTS_QUEUE,
    }),
  ],
  providers: [ProjectsJobsService, ProjectsCreatedProcessor],
  exports: [ProjectsJobsService],
})
export class ProjectsJobsModule {}
