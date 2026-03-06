import dataSource from '../apps/api/src/infrastructure/database/typeorm.datasource';
import { ProjectEntity } from '../apps/api/src/modules/projects/infra/project.entity';
import { AuthUserEntity } from '../apps/api/src/modules/auth/entities/auth-user.entity';
import { hashPassword } from '../apps/api/src/modules/auth/password.util';

async function seed(): Promise<void> {
  await dataSource.initialize();

  try {
    const projectsRepository = dataSource.getRepository(ProjectEntity);
    const usersRepository = dataSource.getRepository(AuthUserEntity);

    const projectId = process.env.SEED_PROJECT_ID ?? '00000000-0000-0000-0000-000000000001';
    const existing = await projectsRepository.findOne({ where: { id: projectId } });

    if (existing) {
       
      console.log(`Seed skipped: project ${projectId} already exists`);
    } else {
      const seededProject = projectsRepository.create({
        id: projectId,
        name: process.env.SEED_PROJECT_NAME ?? 'Nexus Forge Demo Project',
        description: process.env.SEED_PROJECT_DESCRIPTION ?? 'Seeded project for local development',
        createdAt: new Date(),
      });

      await projectsRepository.save(seededProject);

       
      console.log(`Seed complete: project ${seededProject.id} created`);
    }

    const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@nexus.local').toLowerCase();
    const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
    const existingAdmin = await usersRepository.findOne({ where: { email: adminEmail } });

    if (existingAdmin) {
       
      console.log(`Seed skipped: auth user ${adminEmail} already exists`);
      return;
    }

    const seededAdmin = usersRepository.create({
      email: adminEmail,
      passwordHash: hashPassword(adminPassword),
      roles: ['admin', 'operator', 'viewer'],
      isActive: true,
    });

    await usersRepository.save(seededAdmin);

     
    console.log(`Seed complete: auth user ${adminEmail} created`);
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error: unknown) => {
   
  console.error('Seed failed', error);
  process.exitCode = 1;
});
