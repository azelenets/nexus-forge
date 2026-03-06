import { Controller, Get, Param, ParseIntPipe, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { OutboxAdminService } from './outbox-admin.service';
import { OutboxEventEntity } from './outbox-event.entity';

@ApiTags('outbox')
@ApiBearerAuth()
@Controller('outbox')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
export class OutboxAdminController {
  constructor(private readonly outboxAdminService: OutboxAdminService) {}

  @Get('events')
  listEvents(
    @Query('status') status?: OutboxEventEntity['status'],
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.outboxAdminService.listEvents(status, limit);
  }

  @Get('dlq')
  listDeadLetters(@Query('limit', new ParseIntPipe({ optional: true })) limit?: number) {
    return this.outboxAdminService.listDeadLetters(limit);
  }

  @Post('dlq/:id/replay')
  replayDeadLetter(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.outboxAdminService.replayDeadLetter(id);
  }
}
