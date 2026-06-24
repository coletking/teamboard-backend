import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum ProjectRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

@Schema({ _id: false })
export class ProjectMember {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user!: Types.ObjectId;

  @Prop({ type: String, enum: ProjectRole, default: ProjectRole.MEMBER })
  role!: ProjectRole;
}

export const ProjectMemberSchema = SchemaFactory.createForClass(ProjectMember);

export type ProjectDocument = HydratedDocument<Project>;

@Schema({ timestamps: true })
export class Project {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ default: '', trim: true })
  description!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  owner!: Types.ObjectId;

  @Prop({ type: [ProjectMemberSchema], default: [] })
  members!: ProjectMember[];
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

ProjectSchema.index({ 'members.user': 1 });
