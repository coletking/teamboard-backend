import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument } from './schemas/task.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import {
  PROJECT_DELETED_EVENT,
  ProjectsService,
} from '../projects/projects.service';
import type { ProjectDeletedPayload } from '../projects/projects.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
    private readonly projectsService: ProjectsService,
  ) {}

  /** Creating a task first asserts the caller owns the parent project. */
  async create(
    projectId: string,
    ownerId: string,
    dto: CreateTaskDto,
  ): Promise<TaskDocument> {
    await this.projectsService.findOneForOwner(projectId, ownerId);
    return this.taskModel.create({
      ...dto,
      project: new Types.ObjectId(projectId),
      owner: new Types.ObjectId(ownerId),
    });
  }

  async findAllForProject(
    projectId: string,
    ownerId: string,
  ): Promise<TaskDocument[]> {
    await this.projectsService.findOneForOwner(projectId, ownerId);
    return this.taskModel
      .find({ project: new Types.ObjectId(projectId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, ownerId: string): Promise<TaskDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Task not found');
    }
    const task = await this.taskModel
      .findOne({ _id: id, owner: new Types.ObjectId(ownerId) })
      .exec();
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async update(
    id: string,
    ownerId: string,
    dto: UpdateTaskDto,
  ): Promise<TaskDocument> {
    const task = await this.findOne(id, ownerId);
    Object.assign(task, dto);
    return task.save();
  }

  async remove(id: string, ownerId: string): Promise<{ id: string; deleted: true }> {
    const task = await this.findOne(id, ownerId);
    await task.deleteOne();
    return { id, deleted: true };
  }

  /**
   * Reacts to a project deletion by removing its tasks. Decoupling this via an
   * event (rather than a direct call from ProjectsService) keeps the modules
   * independent and mirrors how they would communicate across services.
   */
  @OnEvent(PROJECT_DELETED_EVENT)
  async handleProjectDeleted(payload: ProjectDeletedPayload): Promise<void> {
    await this.taskModel
      .deleteMany({ project: new Types.ObjectId(payload.projectId) })
      .exec();
  }
}
