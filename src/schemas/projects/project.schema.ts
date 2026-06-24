import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

/** A user's role within a single project. */
export enum ProjectRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

/**
 * Sub-document linking a user to a project with a role. Stored inline on the
 * project (no separate collection) since membership lists are small and always
 * read together with the project.
 */
@Schema({ _id: false })
export class ProjectMember {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: String, enum: ProjectRole, default: ProjectRole.MEMBER })
  role: ProjectRole;
}

export const ProjectMemberSchema = SchemaFactory.createForClass(ProjectMember);

export type ProjectDocument = HydratedDocument<Project>;

@Schema({ timestamps: true })
export class Project {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: '', trim: true })
  description: string;

  /** The creator of the project — always also an ADMIN member. */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  owner: Types.ObjectId;

  /** Everyone with access to the project, each with a role. */
  @Prop({ type: [ProjectMemberSchema], default: [] })
  members: ProjectMember[];
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

// Fast "projects this user belongs to" lookups for lists and the dashboard.
ProjectSchema.index({ 'members.user': 1 });
