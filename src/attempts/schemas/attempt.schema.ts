import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import type { AttemptStatus, QuestionType } from '../../common/enums';

export type AttemptDocument = Attempt & Document;

class AttemptItem {
  @Prop({ type: Types.ObjectId, ref: 'Question', required: true })
  questionId: Types.ObjectId;

  @Prop({ type: String, required: true })
  qType: QuestionType;

  @Prop({ type: Number, default: 1 })
  points: number;

  // لقطة للعرض وقت الامتحان
  @Prop({ trim: true }) promptSnapshot?: string;
  @Prop({ type: [String], default: [] }) optionsText?: string[]; // لـ mcq
  @Prop({ type: [SchemaTypes.Mixed], default: [] }) optionOrder?: any[]; // احتفظي بالترتيب
  @Prop({ type: SchemaTypes.Mixed }) answerKeySnapshot?: any; // فقط القدر اللازم للتصحيح
}
const AttemptItemSchema = SchemaFactory.createForClass(AttemptItem);

@Schema({ timestamps: true, collection: 'attempts' })
export class Attempt {
  @Prop({ type: Types.ObjectId, ref: 'Exam', required: true, index: true })
  examId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  studentId: Types.ObjectId;

  @Prop({ type: String, enum: ['in_progress', 'submitted', 'graded'], default: 'in_progress', index: true })
  status: AttemptStatus;

  @Prop() startedAt?: Date;
  @Prop() submittedAt?: Date;
  @Prop() expiresAt?: Date;
  @Prop({ type: Number, default: 0 }) timeUsedSec?: number;

  @Prop({ type: SchemaTypes.Mixed }) randomSeed?: string | number;

  @Prop({ type: [AttemptItemSchema], default: [], _id: false })
  items: AttemptItem[];
}

export const AttemptSchema = SchemaFactory.createForClass(Attempt);
AttemptSchema.index({ examId: 1, studentId: 1, status: 1 });
