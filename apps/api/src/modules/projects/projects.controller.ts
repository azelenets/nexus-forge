import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateProjectCommand } from './commands/create-project.command';
import { GetProjectByIdQuery } from './queries/get-project-by-id.query';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ProjectsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @Roles('admin', 'operator')
  async create(@Body() dto: CreateProjectDto) {
    const projectId = await this.commandBus.execute(
      new CreateProjectCommand(dto.name, dto.description),
    );

    return { projectId };
  }

  @Get(':id')
  @Roles('admin', 'operator', 'viewer')
  getById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.queryBus.execute(new GetProjectByIdQuery(id));
  }
}
