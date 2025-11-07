import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import type {
  ExamStatus,
  QuestionLevel,
  QuestionProvider,
  QuestionSection,
} from '../../common/enums';

export type ExamDocument = Exam & Document;

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
  @Prop({ type: String, enum: ['LanguageBlocks', 'Listening', 'Reading', 'Writing', 'Speaking'], required: true })
  section: QuestionSection;

  // واحد من الاتنين: items ثابتة أو quota
  @Prop({ type: [SectionItemSchema], default: [], _id: false })
  items?: SectionItem[];

  @Prop({ type: SectionQuotaSchema, _id: false })
  quota?: SectionQuota;
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

  @Prop({ type: String, enum: ['A1', 'A2', 'B1', 'B2'], index: true })
  level?: QuestionLevel;

  @Prop({ type: String, enum: ['General', 'DTZ', 'Other'], index: true })
  provider?: QuestionProvider;

  @Prop({ type: String, enum: ['draft', 'published'], default: 'draft', index: true })
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
}

export const ExamSchema = SchemaFactory.createForClass(Exam);
ExamSchema.index({ level: 1, provider: 1, status: 1 });
