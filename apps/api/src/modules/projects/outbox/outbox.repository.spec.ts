import type { EntityManager, Repository } from 'typeorm';
import type { OutboxDeadLetterEntity } from './outbox-dead-letter.entity';
import { OutboxEventEntity } from './outbox-event.entity';
import { OutboxRepository } from './outbox.repository';

describe('OutboxRepository', () => {
  function makeQueryBuilder() {
    return {
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ id: 'e1' }]),
    };
  }

  it('enqueues event with event repository by default', async () => {
    const eventRepository = { insert: jest.fn().mockResolvedValue(undefined) } as unknown as Repository<OutboxEventEntity>;
    const deadLetterRepository = {} as Repository<OutboxDeadLetterEntity>;
    const repository = new OutboxRepository(eventRepository, deadLetterRepository);

    await repository.enqueue('event.name', 'agg-1', { a: 1 });

    expect(eventRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'event.name',
        aggregateId: 'agg-1',
        status: 'pending',
        attempts: 0,
      }),
    );
  });

  it('enqueues using manager repository when manager is provided', async () => {
    const managerRepo = { insert: jest.fn().mockResolvedValue(undefined) };
    const manager = { getRepository: jest.fn(() => managerRepo) } as unknown as EntityManager;
    const eventRepository = {} as Repository<OutboxEventEntity>;
    const deadLetterRepository = {} as Repository<OutboxDeadLetterEntity>;
    const repository = new OutboxRepository(eventRepository, deadLetterRepository);

    await repository.enqueue('event.name', 'agg-1', { a: 1 }, manager);

    expect((manager as any).getRepository).toHaveBeenCalledWith(OutboxEventEntity);
    expect(managerRepo.insert).toHaveBeenCalled();
  });

  it('lists events with sanitized limit and optional status filter', async () => {
    const qb = makeQueryBuilder();
    const eventRepository = { createQueryBuilder: jest.fn(() => qb) } as unknown as Repository<OutboxEventEntity>;
    const deadLetterRepository = {} as Repository<OutboxDeadLetterEntity>;
    const repository = new OutboxRepository(eventRepository, deadLetterRepository);

    await expect(repository.listEvents('failed', 999)).resolves.toEqual([{ id: 'e1' }]);

    expect(qb.limit).toHaveBeenCalledWith(500);
    expect(qb.where).toHaveBeenCalledWith('event.status = :status', { status: 'failed' });
  });

  it('lists dead letters with sanitized limit', async () => {
    const deadLetterRepository = {
      find: jest.fn().mockResolvedValue([{ id: 'd1' }]),
    } as unknown as Repository<OutboxDeadLetterEntity>;

    const eventRepository = {} as Repository<OutboxEventEntity>;
    const repository = new OutboxRepository(eventRepository, deadLetterRepository);

    await expect(repository.listDeadLetters(-1)).resolves.toEqual([{ id: 'd1' }]);

    expect(deadLetterRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'DESC' },
      take: 1,
    });
  });

  it('replays dead letter and marks replayedAt when found', async () => {
    const deadLetterRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'd1',
        eventName: 'projects.created.v1',
        aggregateId: 'a1',
        payload: { a: 1 },
      }),
      update: jest.fn().mockResolvedValue(undefined),
    } as unknown as Repository<OutboxDeadLetterEntity>;

    const eventRepository = {
      insert: jest.fn().mockResolvedValue(undefined),
    } as unknown as Repository<OutboxEventEntity>;

    const repository = new OutboxRepository(eventRepository, deadLetterRepository);

    await expect(repository.replayDeadLetter('d1')).resolves.toBe(true);
    expect(eventRepository.insert).toHaveBeenCalled();
    expect(deadLetterRepository.update).toHaveBeenCalledWith({ id: 'd1' }, { replayedAt: expect.any(Date) });
  });

  it('returns false when dead letter is missing', async () => {
    const deadLetterRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
    } as unknown as Repository<OutboxDeadLetterEntity>;

    const eventRepository = { insert: jest.fn() } as unknown as Repository<OutboxEventEntity>;
    const repository = new OutboxRepository(eventRepository, deadLetterRepository);

    await expect(repository.replayDeadLetter('missing')).resolves.toBe(false);
    expect(eventRepository.insert).not.toHaveBeenCalled();
  });
});
