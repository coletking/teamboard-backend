import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Task,
  TaskDocument,
  TaskStatus,
} from '../../schemas/tasks/task.schema';
import { CreateTaskDto } from '../../dto/tasks/create-task.dto';
import { UpdateTaskDto } from '../../dto/tasks/update-task.dto';
import { ProjectsService } from '../projects/projects.service';
import { EventBus } from '../../events/event-bus.service';
import {
  PROJECT_DELETED_EVENT,
  ProjectDeletedPayload,
} from '../../events/events.constants';

export interface StatusBreakdown {
  todo: number;
  in_progress: number;
  done: number;
}

@Injectable()
export class TasksService implements OnModuleInit {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
    private readonly projectsService: ProjectsService,
    private readonly eventBus: EventBus,
  ) {}

  onModuleInit(): void {
    this.eventBus.on<ProjectDeletedPayload>(PROJECT_DELETED_EVENT, (payload) =>
      this.handleProjectDeleted(payload),
    );
  }

  async create(
    projectId: string,
    userId: string,
    dto: CreateTaskDto,
  ): Promise<TaskDocument> {
    await this.projectsService.findForMember(projectId, userId);
    return this.taskModel.create({
      ...dto,
      project: new Types.ObjectId(projectId),
      createdBy: new Types.ObjectId(userId),
    });
  }

  async findAllForProject(
    projectId: string,
    userId: string,
  ): Promise<TaskDocument[]> {
    await this.projectsService.findForMember(projectId, userId);
    return this.taskModel
      .find({ project: new Types.ObjectId(projectId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, userId: string): Promise<TaskDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Task not found');
    }
    const task = await this.taskModel.findById(id).exec();
    if (!task) throw new NotFoundException('Task not found');
    await this.projectsService.findForMember(task.project.toString(), userId);
    return task;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateTaskDto,
  ): Promise<TaskDocument> {
    const task = await this.findOne(id, userId);
    Object.assign(task, dto);
    return task.save();
  }

  async remove(
    id: string,
    userId: string,
  ): Promise<{ id: string; deleted: true }> {
    const task = await this.findOne(id, userId);
    await task.deleteOne();
    return { id, deleted: true };
  }

  async countByStatusForProjects(
    projectIds: Types.ObjectId[],
  ): Promise<StatusBreakdown> {
    const rows = await this.taskModel.aggregate<{
      _id: TaskStatus;
      count: number;
    }>([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const breakdown: StatusBreakdown = { todo: 0, in_progress: 0, done: 0 };
    for (const row of rows) {
      breakdown[row._id] = row.count;
    }
    return breakdown;
  }

  async countPerProject(
    projectIds: Types.ObjectId[],
  ): Promise<Map<string, number>> {
    const rows = await this.taskModel.aggregate<{
      _id: Types.ObjectId;
      count: number;
    }>([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: '$project', count: { $sum: 1 } } },
    ]);
    return new Map(rows.map((r) => [r._id.toString(), r.count]));
  }

  async handleProjectDeleted(payload: ProjectDeletedPayload): Promise<void> {
    await this.taskModel
      .deleteMany({ project: new Types.ObjectId(payload.projectId) })
      .exec();
  }
}
