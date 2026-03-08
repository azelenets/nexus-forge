import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxEventEntity } from './outbox-event.entity';
import { OutboxDeadLetterEntity } from './outbox-dead-letter.entity';
import { OutboxRepository } from './outbox.repository';
import { OutboxPublisher } from './outbox.publisher';
import { OutboxAdminService } from './outbox-admin.service';
import { OutboxAdminController } from './outbox-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OutboxEventEntity, OutboxDeadLetterEntity])],
  controllers: [OutboxAdminController],
  providers: [OutboxRepository, OutboxPublisher, OutboxAdminService],
  exports: [OutboxRepository],
})
export class OutboxModule {}
