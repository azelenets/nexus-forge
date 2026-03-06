import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PROJECT_CREATED_JOB, PROJECTS_QUEUE } from './projects-jobs.constants';

@Injectable()
export class ProjectsJobsService {
  constructor(
    @InjectQueue(PROJECTS_QUEUE)
    private readonly queue: Queue,
  ) {}

  enqueueProjectCreated(payload: { projectId: string; name: string }): Promise<void> {
    return this.queue
      .add(PROJECT_CREATED_JOB, payload, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: 100,
      })
      .then(() => undefined);
  }
}
