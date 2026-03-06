import { ProjectCreatedEvent } from './project-created.event';
import { ProjectCreatedHandler } from './project-created.handler';

describe('ProjectCreatedHandler', () => {
  it('logs event details', () => {
    const handler = new ProjectCreatedHandler();
    const logSpy = jest.spyOn((handler as any).logger, 'log').mockImplementation();

    handler.handle(new ProjectCreatedEvent('p1', 'Project', new Date('2026-01-01T00:00:00.000Z')));

    expect(logSpy).toHaveBeenCalledWith('Project created: p1 (Project)');
  });
});
