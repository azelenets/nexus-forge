import type { DataSource } from 'typeorm';
import { ProjectAggregate } from './domain/project.aggregate';
import type { ProjectRepository } from './domain/project.repository';
import type { ProjectsJobsService } from './jobs/projects-jobs.service';
import type { OutboxRepository } from './outbox/outbox.repository';
import { ProjectWriteService } from './project-write.service';

describe('ProjectWriteService', () => {
  it('persists project and enqueues outbox event inside transaction, then schedules queue job', async () => {
    const manager = { id: 'manager' } as any;
    const dataSource = {
      transaction: jest.fn(async (fn: (m: any) => Promise<void>) => fn(manager)),
    } as unknown as DataSource;

    const projectRepository = {
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as ProjectRepository;

    const outboxRepository = {
      enqueue: jest.fn().mockResolvedValue(undefined),
    } as unknown as OutboxRepository;

    const jobs = {
      enqueueProjectCreated: jest.fn().mockResolvedValue(undefined),
    } as unknown as ProjectsJobsService;

    const service = new ProjectWriteService(dataSource, projectRepository, outboxRepository, jobs);
    const project = ProjectAggregate.rehydrate('p1', 'Project', 'Desc', new Date('2026-01-01T00:00:00.000Z'));

    await service.createProject(project);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(projectRepository.save).toHaveBeenCalledWith(project, manager);
    expect(outboxRepository.enqueue).toHaveBeenCalledWith(
      'projects.created.v1',
      'p1',
      {
        projectId: 'p1',
        name: 'Project',
        description: 'Desc',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      manager,
    );
    expect(jobs.enqueueProjectCreated).toHaveBeenCalledWith({ projectId: 'p1', name: 'Project' });
  });

  it('does not throw if queue enqueue fails after transaction', async () => {
    const manager = { id: 'manager' } as any;
    const dataSource = {
      transaction: jest.fn(async (fn: (m: any) => Promise<void>) => fn(manager)),
    } as unknown as DataSource;

    const projectRepository = {
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as ProjectRepository;

    const outboxRepository = {
      enqueue: jest.fn().mockResolvedValue(undefined),
    } as unknown as OutboxRepository;

    const jobs = {
      enqueueProjectCreated: jest.fn().mockRejectedValue(new Error('queue down')),
    } as unknown as ProjectsJobsService;

    const service = new ProjectWriteService(dataSource, projectRepository, outboxRepository, jobs);
    const warnSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation();

    await expect(service.createProject(ProjectAggregate.create('p2', 'X', 'Y'))).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalled();
  });
});
