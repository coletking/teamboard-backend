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
    // Needed by invites to find-or-create the invited user.
    UsersModule,
  ],
  controllers: [ProjectsController, MembersController],
  providers: [ProjectsService],
  // Exported so Tasks and Dashboard modules can reuse membership/role logic.
  exports: [ProjectsService],
})
export class ProjectsModule {}
