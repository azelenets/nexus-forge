export class ProjectCreatedEvent {
  constructor(
    readonly projectId: string,
    readonly name: string,
    readonly createdAt: Date,
  ) {}
}
