import { AggregateRoot } from '@nestjs/cqrs';

export class ProjectAggregate extends AggregateRoot {
  private constructor(
    readonly id: string,
    readonly name: string,
    readonly description: string,
    readonly createdAt: Date,
  ) {
    super();
  }

  static create(id: string, name: string, description: string): ProjectAggregate {
    return new ProjectAggregate(id, name, description, new Date());
  }

  static rehydrate(
    id: string,
    name: string,
    description: string,
    createdAt: Date,
  ): ProjectAggregate {
    return new ProjectAggregate(id, name, description, createdAt);
  }
}
