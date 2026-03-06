import type { Queue } from 'bullmq';
import { PROJECT_CREATED_JOB } from './projects-jobs.constants';
import { ProjectsJobsService } from './projects-jobs.service';

describe('ProjectsJobsService', () => {
  it('enqueues project-created job with retry settings', async () => {
    const queue = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    } as unknown as Queue;

    const service = new ProjectsJobsService(queue);

    await expect(service.enqueueProjectCreated({ projectId: 'p1', name: 'Project One' })).resolves.toBeUndefined();

    expect(queue.add).toHaveBeenCalledWith(
      PROJECT_CREATED_JOB,
      { projectId: 'p1', name: 'Project One' },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  });
});
