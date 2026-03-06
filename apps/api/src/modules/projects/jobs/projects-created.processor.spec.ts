import type { Job } from 'bullmq';
import { PROJECT_CREATED_JOB } from './projects-jobs.constants';
import { ProjectsCreatedProcessor } from './projects-created.processor';

describe('ProjectsCreatedProcessor', () => {
  it('logs warn for unsupported job', async () => {
    const processor = new ProjectsCreatedProcessor();
    const warnSpy = jest.spyOn((processor as any).logger, 'warn').mockImplementation();

    await processor.process({ name: 'other-job', data: { projectId: 'p1', name: 'P' } } as Job<any>);

    expect(warnSpy).toHaveBeenCalledWith('Skipping unsupported job other-job');
  });

  it('logs processing for supported job', async () => {
    const processor = new ProjectsCreatedProcessor();
    const logSpy = jest.spyOn((processor as any).logger, 'log').mockImplementation();

    await processor.process({ name: PROJECT_CREATED_JOB, data: { projectId: 'p1', name: 'P' } } as Job<any>);

    expect(logSpy).toHaveBeenCalledWith('Processed project-created for project=p1 (P)');
  });
});
