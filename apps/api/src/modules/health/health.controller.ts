import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MicroserviceHealthIndicator, HealthCheck, HealthCheckService, MemoryHealthIndicator, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly typeOrm: TypeOrmHealthIndicator,
    private readonly microservice: MicroserviceHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  getHealth() {
    const servers = this.config
      .get<string>('NATS_SERVERS', 'nats://localhost:4222')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    return this.health.check([
      () => this.typeOrm.pingCheck('database'),
      () =>
        this.microservice.pingCheck<MicroserviceOptions>('nats', {
          transport: Transport.NATS,
          options: {
            servers,
          },
        }),
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
    ]);
  }
}
