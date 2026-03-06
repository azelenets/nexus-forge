import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProjectAggregate } from './domain/project.aggregate';
import { PROJECT_REPOSITORY, ProjectRepository } from './domain/project.repository';
import { OutboxRepository } from './outbox/outbox.repository';
import { ProjectsJobsService } from './jobs/projects-jobs.service';

@Injectable()
export class ProjectWriteService {
  private readonly logger = new Logger(ProjectWriteService.name);

  constructor(
    private readonly dataSource: DataSource,
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
    private readonly outboxRepository: OutboxRepository,
    private readonly projectsJobsService: ProjectsJobsService,
  ) {}

  async createProject(project: ProjectAggregate): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await this.projectRepository.save(project, manager);
      await this.outboxRepository.enqueue(
        'projects.created.v1',
        project.id,
        {
          projectId: project.id,
          name: project.name,
          description: project.description,
          createdAt: project.createdAt.toISOString(),
        },
        manager,
      );
    });

    try {
      await this.projectsJobsService.enqueueProjectCreated({
        projectId: project.id,
        name: project.name,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown queue error';
      this.logger.warn(`Failed to enqueue project-created job for ${project.id}: ${message}`);
    }
  }
}
