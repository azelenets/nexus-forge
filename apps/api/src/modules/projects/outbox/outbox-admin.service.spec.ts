import { NotFoundException } from '@nestjs/common';
import type { OutboxRepository } from './outbox.repository';
import { OutboxAdminService } from './outbox-admin.service';

describe('OutboxAdminService', () => {
  it('delegates list operations', async () => {
    const outboxRepository = {
      listEvents: jest.fn().mockResolvedValue([{ id: 'e1' }]),
      listDeadLetters: jest.fn().mockResolvedValue([{ id: 'd1' }]),
      replayDeadLetter: jest.fn(),
    } as unknown as OutboxRepository;

    const service = new OutboxAdminService(outboxRepository);

    await expect(service.listEvents('pending', 10)).resolves.toEqual([{ id: 'e1' }]);
    await expect(service.listDeadLetters(5)).resolves.toEqual([{ id: 'd1' }]);

    expect(outboxRepository.listEvents).toHaveBeenCalledWith('pending', 10);
    expect(outboxRepository.listDeadLetters).toHaveBeenCalledWith(5);
  });

  it('throws when replay id does not exist', async () => {
    const outboxRepository = {
      listEvents: jest.fn(),
      listDeadLetters: jest.fn(),
      replayDeadLetter: jest.fn().mockResolvedValue(false),
    } as unknown as OutboxRepository;

    const service = new OutboxAdminService(outboxRepository);

    await expect(service.replayDeadLetter('id-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns success response on replay', async () => {
    const outboxRepository = {
      listEvents: jest.fn(),
      listDeadLetters: jest.fn(),
      replayDeadLetter: jest.fn().mockResolvedValue(true),
    } as unknown as OutboxRepository;

    const service = new OutboxAdminService(outboxRepository);

    await expect(service.replayDeadLetter('id-2')).resolves.toEqual({ replayed: true, id: 'id-2' });
  });
});
