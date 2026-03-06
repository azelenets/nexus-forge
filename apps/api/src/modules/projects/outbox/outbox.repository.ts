import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { OutboxEventEntity } from './outbox-event.entity';
import { OutboxDeadLetterEntity } from './outbox-dead-letter.entity';

@Injectable()
export class OutboxRepository {
  constructor(
    @InjectRepository(OutboxEventEntity)
    private readonly eventRepository: Repository<OutboxEventEntity>,
    @InjectRepository(OutboxDeadLetterEntity)
    private readonly deadLetterRepository: Repository<OutboxDeadLetterEntity>,
  ) {}

  async enqueue(
    eventName: string,
    aggregateId: string,
    payload: Record<string, unknown>,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager ? manager.getRepository(OutboxEventEntity) : this.eventRepository;
    await repo.insert({
      eventName,
      aggregateId,
      payload: payload as object,
      status: 'pending',
      attempts: 0,
      lastError: null,
      processedAt: null,
    });
  }

  listEvents(status?: OutboxEventEntity['status'], limit = 100): Promise<OutboxEventEntity[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 500);
    const qb = this.eventRepository.createQueryBuilder('event').orderBy('event.createdAt', 'DESC').limit(safeLimit);

    if (status) {
      qb.where('event.status = :status', { status });
    }

    return qb.getMany();
  }

  listDeadLetters(limit = 100): Promise<OutboxDeadLetterEntity[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 500);
    return this.deadLetterRepository.find({
      order: { createdAt: 'DESC' },
      take: safeLimit,
    });
  }

  async replayDeadLetter(dlqId: string): Promise<boolean> {
    const dlq = await this.deadLetterRepository.findOne({ where: { id: dlqId } });
    if (!dlq) {
      return false;
    }

    await this.eventRepository.insert({
      eventName: dlq.eventName,
      aggregateId: dlq.aggregateId,
      payload: dlq.payload as object,
      status: 'pending',
      attempts: 0,
      lastError: null,
      processedAt: null,
    });

    await this.deadLetterRepository.update({ id: dlq.id }, { replayedAt: new Date() });
    return true;
  }
}
