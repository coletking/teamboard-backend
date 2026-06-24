import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Project, ProjectSchema } from '../../schemas/projects/project.schema';
import { ProjectsController } from './projects.controller';
import { MembersController } from './members.controller';
import { ProjectsService } from './projects.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }]),

    UsersModule,
  ],
  controllers: [ProjectsController, MembersController],
  providers: [ProjectsService],

  exports: [ProjectsService],
})
export class ProjectsModule {}
