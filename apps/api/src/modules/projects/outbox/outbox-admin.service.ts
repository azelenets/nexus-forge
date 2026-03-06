import { Injectable, NotFoundException } from '@nestjs/common';
import { OutboxRepository } from './outbox.repository';
import { OutboxEventEntity } from './outbox-event.entity';

@Injectable()
export class OutboxAdminService {
  constructor(private readonly outboxRepository: OutboxRepository) {}

  listEvents(status?: OutboxEventEntity['status'], limit?: number) {
    return this.outboxRepository.listEvents(status, limit);
  }

  listDeadLetters(limit?: number) {
    return this.outboxRepository.listDeadLetters(limit);
  }

  async replayDeadLetter(id: string) {
    const replayed = await this.outboxRepository.replayDeadLetter(id);
    if (!replayed) {
      throw new NotFoundException(`Dead-letter item not found: ${id}`);
    }

    return { replayed: true, id };
  }
}
