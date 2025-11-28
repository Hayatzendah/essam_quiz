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

@Schema({ _id: false })
export class SectionItem {
  @Prop({ type: Types.ObjectId, ref: 'Question', required: true })
  questionId: Types.ObjectId;

  @Prop({ type: Number, default: 1, min: 0 })
  points?: number;
}
export const SectionItemSchema = SchemaFactory.createForClass(SectionItem);

class SectionQuota {
  @Prop({ type: Number, required: true, min: 1 })
  count: number;
}
const SectionQuotaSchema = SchemaFactory.createForClass(SectionQuota);

@Schema({ _id: false })
export class ExamSection {
  // 🔥 استخدمي title فقط، بدون name
  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: [SectionItemSchema], default: [] })
  items: SectionItem[];
}
export const ExamSectionSchema = SchemaFactory.createForClass(ExamSection);

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

// Pre-save hook to ensure sections is always an array and never contains null or empty objects
ExamSchema.pre('save', function (next) {
  // Ensure sections is always an array
  if (!Array.isArray(this.sections)) {
    this.sections = [];
  } else {
    // Filter out ONLY null and undefined - DO NOT filter out sections with empty items
    // The validation in service layer should handle empty sections
    this.sections = this.sections
      .filter((s: any) => {
        // Remove ONLY null or undefined - nothing else!
        if (s === null || s === undefined) {
          return false;
        }
        // Keep everything else - even empty objects {} (service validation will catch them)
        return true;
      })
      .map((s: any) => {
        // التأكد من أن items موجودة ومحفوظة بشكل صحيح
        if (s && typeof s === 'object' && !Array.isArray(s)) {
          // إذا كان section يحتوي على items، تأكد من أنها محفوظة
          if ('items' in s && Array.isArray(s.items)) {
            // تنظيف items من null/undefined فقط، لكن احتفظ بالباقي
            s.items = s.items.filter((item: any) => {
              return item !== null && item !== undefined && item !== '';
            });
          }
        }
        return s;
      });
  }
  next();
});
