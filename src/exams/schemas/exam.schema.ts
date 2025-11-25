import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ExamDocument = Exam & Document;

export enum ExamStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Schema({ _id: false })
export class SectionItem {
  @Prop({ type: Types.ObjectId, ref: 'Question', required: true })
  questionId: Types.ObjectId;

  @Prop({ type: Number, default: 1, min: 0 })
  points: number;
}
const SectionItemSchema = SchemaFactory.createForClass(SectionItem);

@Schema({ _id: false })
export class DifficultyDistribution {
  @Prop({ type: Number, min: 0, default: 0 }) easy: number;
  @Prop({ type: Number, min: 0, default: 0 }) medium: number;
  @Prop({ type: Number, min: 0, default: 0 }) hard: number;
}
const DifficultyDistributionSchema = SchemaFactory.createForClass(DifficultyDistribution);

@Schema({ _id: false })
export class ExamSection {
  @Prop({ required: true, trim: true }) name: string;

  // مهارة القسم: HOEREN, LESEN, SCHREIBEN, SPRECHEN
  @Prop({ 
    type: String, 
    enum: ['HOEREN', 'LESEN', 'SCHREIBEN', 'SPRECHEN'],
    trim: true 
  })
  skill?: 'HOEREN' | 'LESEN' | 'SCHREIBEN' | 'SPRECHEN';

  // تسمية القسم (يمكن استخدام name أو label)
  @Prop({ trim: true })
  label?: string;

  // مدة القسم بالدقائق
  @Prop({ type: Number, min: 0 })
  durationMin?: number;

  // عدد الأجزاء في القسم (يمكن حسابه من items/quota)
  @Prop({ type: Number, min: 0 })
  partsCount?: number;

  // طريقة 1: أسئلة ثابتة
  @Prop({ type: [SectionItemSchema], default: undefined })
  items?: SectionItem[];

  // طريقة 2: حصص عشوائية
  @Prop({ type: Number, min: 1 })
  quota?: number;

  @Prop({ type: DifficultyDistributionSchema })
  difficultyDistribution?: DifficultyDistribution;

  // عشوائية ترتيب الأسئلة داخل هذا السكشن (لما يكون فيه items)
  @Prop({ type: Boolean, default: false })
  randomize?: boolean;

  // Tags للفلترة عند اختيار الأسئلة العشوائية (مثل: ["Bayern"], ["300-Fragen"], ["Hören", "Teil-1"])
  @Prop({ type: [String], default: [] })
  tags?: string[];
}
const ExamSectionSchema = SchemaFactory.createForClass(ExamSection);

@Schema({ timestamps: true })
export class Exam {
  @Prop({ required: true, trim: true }) title: string;
  @Prop({ trim: true }) description?: string;
  @Prop({ trim: true }) level?: string;
  @Prop({ trim: true }) provider?: string; // telc, Goethe, ÖSD, ECL, DTB, DTZ, Deutschland-in-Leben, Grammatik, Wortschatz

  @Prop({ type: String, enum: Object.values(ExamStatus), default: ExamStatus.DRAFT })
  status: ExamStatus;

  @Prop({ type: [ExamSectionSchema], required: true })
  sections: ExamSection[];

  // إعدادات عامة
  @Prop({ type: Boolean, default: false })
  randomizeQuestions: boolean;

  // 0 أو undefined = غير محدود
  @Prop({ type: Number, default: 0, min: 0 })
  attemptLimit: number;

  // زمن الامتحان بالدقائق (0 = غير محدود)
  @Prop({ type: Number, default: 0, min: 0 })
  timeLimitMin: number;

  // سياسة عرض النتائج للطالب بعد التسليم
  @Prop({ 
    type: String, 
    enum: ['only_scores', 'correct_with_scores', 'explanations_with_scores', 'release_delayed'],
    default: 'only_scores'
  })
  resultsPolicy: 'only_scores' | 'correct_with_scores' | 'explanations_with_scores' | 'release_delayed';

  // مالك الامتحان (المعلم الذي أنشأه)
  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  ownerId: Types.ObjectId;

  // إسناد اختياري
  @Prop({ type: Types.ObjectId, ref: 'Class' })
  assignedClassId?: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: undefined })
  assignedStudentIds?: Types.ObjectId[];
}

export const ExamSchema = SchemaFactory.createForClass(Exam);

// فهارس
ExamSchema.index({ ownerId: 1, status: 1 });
ExamSchema.index({ status: 1, level: 1 });

// تحققات أساسية على تعريف السكاشن
ExamSchema.pre('validate', function (next) {
  const exam = this as ExamDocument;

  if (!Array.isArray(exam.sections) || exam.sections.length === 0) {
    return next(new Error('Exam must include at least one section'));
  }

  for (const s of exam.sections) {
    const hasItems = Array.isArray(s.items) && s.items.length > 0;
    const hasQuota = typeof s.quota === 'number' && s.quota > 0;

    // لا نسمح بالجمع داخل نفس السكشن
    if (hasItems && hasQuota) {
      return next(new Error(`Section "${s.name}" cannot have both items and quota`));
    }
    if (!hasItems && !hasQuota) {
      return next(new Error(`Section "${s.name}" must have either items or quota`));
    }

    if (hasItems) {
      for (const it of s.items!) {
        if (!it.questionId) {
          return next(new Error(`Section "${s.name}" has item without questionId`));
        }
      }
    }

    if (hasQuota && s.difficultyDistribution) {
      const sum = (s.difficultyDistribution.easy || 0)
                + (s.difficultyDistribution.medium || 0)
                + (s.difficultyDistribution.hard || 0);
      if (sum !== s.quota) {
        return next(new Error(`Section "${s.name}" difficultyDistribution must sum to quota`));
      }
    }
  }

  next();
});
