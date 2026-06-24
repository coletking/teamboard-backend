import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Task, TaskSchema } from '../../schemas/tasks/task.schema';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),

    ProjectsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],

  exports: [TasksService],
})
export class TasksModule {}
