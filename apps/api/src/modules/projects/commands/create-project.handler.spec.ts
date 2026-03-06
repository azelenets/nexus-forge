import { ProjectAggregate } from '../domain/project.aggregate';
import { CreateProjectCommand } from './create-project.command';
import { CreateProjectHandler } from './create-project.handler';
import type { ProjectWriteService } from '../project-write.service';

jest.mock('node:crypto', () => ({ randomUUID: () => 'fixed-uuid' }));

describe('CreateProjectHandler', () => {
  it('creates aggregate, persists it and returns id', async () => {
    const projectWriteService = {
      createProject: jest.fn().mockResolvedValue(undefined),
    } as unknown as ProjectWriteService;

    const handler = new CreateProjectHandler(projectWriteService);
    const command = new CreateProjectCommand('Project A', 'Description A');

    const id = await handler.execute(command);

    expect(id).toBe('fixed-uuid');
    expect(projectWriteService.createProject).toHaveBeenCalledTimes(1);
    const aggregate = (projectWriteService.createProject as jest.Mock).mock.calls[0][0] as ProjectAggregate;
    expect(aggregate).toBeInstanceOf(ProjectAggregate);
    expect(aggregate.id).toBe('fixed-uuid');
    expect(aggregate.name).toBe('Project A');
    expect(aggregate.description).toBe('Description A');
  });
});
