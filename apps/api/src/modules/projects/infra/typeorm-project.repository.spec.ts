import type { EntityManager, Repository } from 'typeorm';
import { ProjectAggregate } from '../domain/project.aggregate';
import { ProjectEntity } from './project.entity';
import { TypeormProjectRepository } from './typeorm-project.repository';

describe('TypeormProjectRepository', () => {
  it('saves using default repository', async () => {
    const repository = {
      save: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn(),
    } as unknown as Repository<ProjectEntity>;

    const adapter = new TypeormProjectRepository(repository);
    const aggregate = ProjectAggregate.rehydrate('p1', 'Project', 'Desc', new Date('2026-01-01T00:00:00.000Z'));

    await adapter.save(aggregate);

    expect(repository.save).toHaveBeenCalledWith({
      id: 'p1',
      name: 'Project',
      description: 'Desc',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
  });

  it('saves using manager repository when manager provided', async () => {
    const managerRepo = { save: jest.fn().mockResolvedValue(undefined) };
    const manager = { getRepository: jest.fn(() => managerRepo) } as unknown as EntityManager;
    const repository = {} as Repository<ProjectEntity>;

    const adapter = new TypeormProjectRepository(repository);
    await adapter.save(ProjectAggregate.create('p2', 'N', 'D'), manager);

    expect((manager as any).getRepository).toHaveBeenCalledWith(ProjectEntity);
    expect(managerRepo.save).toHaveBeenCalled();
  });

  it('finds and rehydrates aggregate', async () => {
    const createdAt = new Date('2026-02-01T00:00:00.000Z');
    const repository = {
      save: jest.fn(),
      findOne: jest.fn().mockResolvedValue({ id: 'p1', name: 'A', description: 'B', createdAt }),
    } as unknown as Repository<ProjectEntity>;

    const adapter = new TypeormProjectRepository(repository);
    const result = await adapter.findById('p1');

    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'p1' } });
    expect(result).toEqual(ProjectAggregate.rehydrate('p1', 'A', 'B', createdAt));
  });

  it('returns null when entity is missing', async () => {
    const repository = {
      save: jest.fn(),
      findOne: jest.fn().mockResolvedValue(null),
    } as unknown as Repository<ProjectEntity>;

    const adapter = new TypeormProjectRepository(repository);
    await expect(adapter.findById('missing')).resolves.toBeNull();
  });
});
