import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Tasks live under a project for creation/listing
 * (`/projects/:projectId/tasks`) but are addressed directly for item
 * operations (`/tasks/:id`), keeping URLs intuitive without nesting every
 * route.
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('projects/:projectId/tasks')
  create(
    @CurrentUser('userId') userId: string,
    @Param('projectId') projectId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(projectId, userId, dto);
  }

  @Get('projects/:projectId/tasks')
  findAll(
    @CurrentUser('userId') userId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.tasksService.findAllForProject(projectId, userId);
  }

  @Get('tasks/:id')
  findOne(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.tasksService.findOne(id, userId);
  }

  @Patch('tasks/:id')
  update(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, userId, dto);
  }

  @Delete('tasks/:id')
  remove(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.tasksService.remove(id, userId);
  }
}
