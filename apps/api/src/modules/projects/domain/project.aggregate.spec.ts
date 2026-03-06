import { ProjectAggregate } from './project.aggregate';

describe('ProjectAggregate', () => {
  it('creates new aggregate with current date', () => {
    const before = Date.now();
    const aggregate = ProjectAggregate.create('p1', 'Name', 'Description');

    expect(aggregate.id).toBe('p1');
    expect(aggregate.name).toBe('Name');
    expect(aggregate.description).toBe('Description');
    expect(aggregate.createdAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('rehydrates aggregate with provided createdAt', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const aggregate = ProjectAggregate.rehydrate('p2', 'N', 'D', createdAt);

    expect(aggregate.createdAt).toBe(createdAt);
  });
});
