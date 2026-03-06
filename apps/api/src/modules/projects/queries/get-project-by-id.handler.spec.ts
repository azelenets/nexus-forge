import { GetProjectByIdHandler } from './get-project-by-id.handler';
import { GetProjectByIdQuery } from './get-project-by-id.query';
import type { ProjectRepository } from '../domain/project.repository';

describe('GetProjectByIdHandler', () => {
  it('returns project from repository', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({ id: 'p1' }),
    } as unknown as ProjectRepository;

    const handler = new GetProjectByIdHandler(repository);
    const result = await handler.execute(new GetProjectByIdQuery('p1'));

    expect(repository.findById).toHaveBeenCalledWith('p1');
    expect(result).toEqual({ id: 'p1' });
  });
});
