import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Model, Types } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

/** Emitted when a project is deleted so other modules (Tasks) can react. */
export const PROJECT_DELETED_EVENT = 'project.deleted';
export interface ProjectDeletedPayload {
  projectId: string;
}

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  create(ownerId: string, dto: CreateProjectDto): Promise<ProjectDocument> {
    return this.projectModel.create({
      ...dto,
      owner: new Types.ObjectId(ownerId),
    });
  }

  findAllForOwner(ownerId: string): Promise<ProjectDocument[]> {
    return this.projectModel
      .find({ owner: new Types.ObjectId(ownerId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Fetch a single project and assert the caller owns it. Reused by the Tasks
   * module as the authorization gate for every task operation.
   */
  async findOneForOwner(
    id: string,
    ownerId: string,
  ): Promise<ProjectDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Project not found');
    }
    const project = await this.projectModel.findById(id).exec();
    if (!project) throw new NotFoundException('Project not found');
    if (project.owner.toString() !== ownerId) {
      throw new ForbiddenException('Access denied');
    }
    return project;
  }

  async update(
    id: string,
    ownerId: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectDocument> {
    const project = await this.findOneForOwner(id, ownerId);
    Object.assign(project, dto);
    return project.save();
  }

  async remove(id: string, ownerId: string): Promise<{ id: string; deleted: true }> {
    const project = await this.findOneForOwner(id, ownerId);
    await project.deleteOne();
    // Decoupled cascade: Tasks module listens for this and removes its data.
    // In a microservice split this becomes a real message-broker event.
    this.eventEmitter.emit(PROJECT_DELETED_EVENT, {
      projectId: id,
    } satisfies ProjectDeletedPayload);
    return { id, deleted: true };
  }
}
