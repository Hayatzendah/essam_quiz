import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import type {
  ExamStatus,
  QuestionLevel,
  QuestionProvider,
  QuestionSection,
} from '../../common/enums';
import {
  ExamStatusEnum,
  QuestionLevel as QuestionLevelEnum,
  QuestionProvider as QuestionProviderEnum,
  QuestionSection as QuestionSectionEnum,
} from '../../common/enums';

export type ExamDocument = Exam & Document;
export type { ExamStatus };
export { ExamStatusEnum };

class SectionItem {
  @Prop({ type: Types.ObjectId, ref: 'Question', required: true })
  questionId: Types.ObjectId;

  @Prop({ type: Number, default: 1 })
  points: number;
}
const SectionItemSchema = SchemaFactory.createForClass(SectionItem);

class SectionQuota {
  @Prop({ type: Number, required: true, min: 1 })
  count: number;
}
const SectionQuotaSchema = SchemaFactory.createForClass(SectionQuota);

class ExamSection {
  @Prop({ type: String, trim: true })
  name?: string;

  @Prop({ type: String, enum: ['HOEREN', 'LESEN', 'SCHREIBEN', 'SPRECHEN'], trim: true })
  skill?: 'HOEREN' | 'LESEN' | 'SCHREIBEN' | 'SPRECHEN';

  @Prop({ type: String, trim: true })
  label?: string;

  @Prop({ type: Number, min: 0 })
  durationMin?: number;

  @Prop({ type: Number, min: 0 })
  partsCount?: number;

  @Prop({ type: String, enum: ['LanguageBlocks', 'Listening', 'Reading', 'Writing', 'Speaking'] })
  section?: QuestionSection;

  // واحد من الاتنين: items ثابتة أو quota
  @Prop({ type: [SectionItemSchema], default: [], _id: false })
  items?: SectionItem[];

  @Prop({ type: Number, min: 1 })
  quota?: number;

  @Prop({ type: [String], default: [] })
  tags?: string[];

  @Prop({ type: Object, _id: false })
  difficultyDistribution?: { easy?: number; medium?: number; hard?: number };

  @Prop({ type: Boolean, default: false })
  randomize?: boolean;
}
const ExamSectionSchema = SchemaFactory.createForClass(ExamSection);

class DifficultyDistribution {
  @Prop({ type: Number, default: 0 }) easy?: number;
  @Prop({ type: Number, default: 0 }) med?: number;
  @Prop({ type: Number, default: 0 }) hard?: number;
}
const DifficultyDistributionSchema = SchemaFactory.createForClass(DifficultyDistribution);

@Schema({ timestamps: true, collection: 'exams' })
export class Exam {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: String, enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], index: true })
  level?: string;

  @Prop({ type: String, index: true })
  provider?: QuestionProvider | string;

  @Prop({ type: String, enum: Object.values(ExamStatusEnum), default: ExamStatusEnum.DRAFT, index: true })
  status: ExamStatus;

  @Prop({ type: [ExamSectionSchema], default: [], _id: false })
  sections: ExamSection[];

  // إعدادات عامة
  @Prop() timeLimitMin?: number;
  @Prop() attemptLimit?: number;
  @Prop({ default: true }) randomizeQuestions?: boolean;
  @Prop({ default: true }) randomizeOptions?: boolean;

  @Prop({ type: DifficultyDistributionSchema, _id: false })
  difficultyDistribution?: DifficultyDistribution;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  ownerId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Class' })
  assignedClassId?: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  assignedStudentIds?: Types.ObjectId[];
}

export const ExamSchema = SchemaFactory.createForClass(Exam);
ExamSchema.index({ level: 1, provider: 1, status: 1 });
