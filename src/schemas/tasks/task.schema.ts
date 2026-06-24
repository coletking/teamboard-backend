import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}

export type TaskDocument = HydratedDocument<Task>;

@Schema({ timestamps: true })
export class Task {
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ default: '', trim: true })
  description!: string;

  @Prop({
    type: String,
    enum: TaskStatus,
    default: TaskStatus.TODO,
    index: true,
  })
  status!: TaskStatus;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  project!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
