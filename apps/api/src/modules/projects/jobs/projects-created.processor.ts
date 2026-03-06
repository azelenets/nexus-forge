import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PROJECT_CREATED_JOB, PROJECTS_QUEUE } from './projects-jobs.constants';

interface ProjectCreatedJobPayload {
  projectId: string;
  name: string;
}

@Processor(PROJECTS_QUEUE)
export class ProjectsCreatedProcessor extends WorkerHost {
  private readonly logger = new Logger(ProjectsCreatedProcessor.name);

  async process(job: Job<ProjectCreatedJobPayload>): Promise<void> {
    if (job.name !== PROJECT_CREATED_JOB) {
      this.logger.warn(`Skipping unsupported job ${job.name}`);
      return;
    }

    this.logger.log(`Processed ${PROJECT_CREATED_JOB} for project=${job.data.projectId} (${job.data.name})`);
  }
}
