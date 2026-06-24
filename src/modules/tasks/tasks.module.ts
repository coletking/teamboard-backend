import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Task, TaskSchema } from '../../schemas/tasks/task.schema';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
    // Brings in ProjectsService for membership checks on the parent project.
    ProjectsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  // Exported so the Dashboard module can aggregate task counts.
  exports: [TasksService],
})
export class TasksModule {}
