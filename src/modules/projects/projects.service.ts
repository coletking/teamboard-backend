import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import {
  Project,
  ProjectDocument,
  ProjectRole,
} from '../../schemas/projects/project.schema';
import { CreateProjectDto } from '../../dto/projects/create-project.dto';
import { UpdateProjectDto } from '../../dto/projects/update-project.dto';
import { UsersService } from '../users/users.service';
import { EventBus } from '../../events/event-bus.service';
import {
  PROJECT_DELETED_EVENT,
  ProjectDeletedPayload,
} from '../../events/events.constants';

export interface MemberView {
  id: string;
  name: string;
  email: string;
  role: ProjectRole;
}

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
    private readonly eventBus: EventBus,
  ) {}

  create(ownerId: string, dto: CreateProjectDto): Promise<ProjectDocument> {
    const owner = new Types.ObjectId(ownerId);
    return this.projectModel.create({
      ...dto,
      owner,
      members: [{ user: owner, role: ProjectRole.ADMIN }],
    });
  }

  findAllForUser(userId: string): Promise<ProjectDocument[]> {
    return this.projectModel
      .find({ 'members.user': new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findForMember(id: string, userId: string): Promise<ProjectDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Project not found');
    }
    const project = await this.projectModel.findById(id).exec();
    if (!project) throw new NotFoundException('Project not found');
    if (!this.isMember(project, userId)) {
      throw new ForbiddenException('Access denied');
    }
    return project;
  }

  async findForAdmin(id: string, userId: string): Promise<ProjectDocument> {
    const project = await this.findForMember(id, userId);
    if (this.roleOf(project, userId) !== ProjectRole.ADMIN) {
      throw new ForbiddenException('Admin privileges required');
    }
    return project;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectDocument> {
    const project = await this.findForAdmin(id, userId);
    Object.assign(project, dto);
    return project.save();
  }

  async remove(
    id: string,
    userId: string,
  ): Promise<{ id: string; deleted: true }> {
    const project = await this.findForAdmin(id, userId);
    await project.deleteOne();

    await this.eventBus.publish(PROJECT_DELETED_EVENT, {
      projectId: id,
    } satisfies ProjectDeletedPayload);
    return { id, deleted: true };
  }

  async listMembers(id: string, userId: string): Promise<MemberView[]> {
    const project = await this.findForMember(id, userId);
    await project.populate<{
      members: {
        user: { _id: Types.ObjectId; name: string; email: string };
        role: ProjectRole;
      }[];
    }>('members.user', 'name email');

    return project.members.map((m) => {
      const user = m.user as unknown as {
        _id: Types.ObjectId;
        name: string;
        email: string;
      };
      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: m.role,
      };
    });
  }

  async inviteMember(
    id: string,
    adminId: string,
    email: string,
  ): Promise<{ member: MemberView; created: boolean }> {
    const project = await this.findForAdmin(id, adminId);
    const defaultPassword = this.config.get<string>('defaultInvitePassword')!;
    const { user, created } = await this.usersService.findOrCreate(
      email,
      defaultPassword,
    );

    if (user.id === adminId) {
      throw new BadRequestException('You cannot invite yourself');
    }
    if (this.isMember(project, user.id)) {
      throw new ConflictException('User is already a member of this project');
    }
    project.members.push({
      user: new Types.ObjectId(user.id),
      role: ProjectRole.MEMBER,
    });
    await project.save();
    return {
      member: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: ProjectRole.MEMBER,
      },
      created,
    };
  }

  async removeMember(
    id: string,
    adminId: string,
    memberUserId: string,
  ): Promise<{ id: string; removed: true }> {
    const project = await this.findForAdmin(id, adminId);
    if (project.owner.toString() === memberUserId) {
      throw new ForbiddenException('The project owner cannot be removed');
    }
    const before = project.members.length;
    project.members = project.members.filter(
      (m) => m.user.toString() !== memberUserId,
    );
    if (project.members.length === before) {
      throw new NotFoundException('Member not found');
    }
    await project.save();
    return { id: memberUserId, removed: true };
  }

  getRole(project: ProjectDocument, userId: string): ProjectRole | undefined {
    return this.roleOf(project, userId);
  }

  private isMember(project: ProjectDocument, userId: string): boolean {
    return project.members.some((m) => m.user.toString() === userId.toString());
  }

  private roleOf(
    project: ProjectDocument,
    userId: string,
  ): ProjectRole | undefined {
    return project.members.find((m) => m.user.toString() === userId.toString())
      ?.role;
  }
}
