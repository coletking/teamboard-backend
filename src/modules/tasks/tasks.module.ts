import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Task, TaskSchema } from './schemas/task.schema';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
    // Brings in ProjectsService for ownership checks on the parent project.
    ProjectsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
