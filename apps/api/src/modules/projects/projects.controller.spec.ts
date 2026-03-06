import type { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateProjectCommand } from './commands/create-project.command';
import { GetProjectByIdQuery } from './queries/get-project-by-id.query';
import { ProjectsController } from './projects.controller';

describe('ProjectsController', () => {
  function makeController() {
    const commandBus = { execute: jest.fn().mockResolvedValue('project-1') } as unknown as CommandBus;
    const queryBus = { execute: jest.fn().mockResolvedValue({ id: 'project-1' }) } as unknown as QueryBus;
    return { controller: new ProjectsController(commandBus, queryBus), commandBus, queryBus };
  }

  it('dispatches create command and returns project id', async () => {
    const { controller, commandBus } = makeController();
    const result = await controller.create({ name: 'Project', description: 'Desc' });

    expect(commandBus.execute).toHaveBeenCalledWith(new CreateProjectCommand('Project', 'Desc'));
    expect(result).toEqual({ projectId: 'project-1' });
  });

  it('dispatches query by id', async () => {
    const { controller, queryBus } = makeController();

    await expect(controller.getById('project-1')).resolves.toEqual({ id: 'project-1' });
    expect(queryBus.execute).toHaveBeenCalledWith(new GetProjectByIdQuery('project-1'));
  });
});
