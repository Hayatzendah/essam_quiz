import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type QuestionDocument = Question & Document;

export enum QuestionType {
  MCQ = 'mcq',
  FILL = 'fill',
  TRUE_FALSE = 'true_false',
  MATCH = 'match',
  REORDER = 'reorder',
}

export enum QuestionStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum QuestionDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

@Schema({ _id: false })
export class McqOption {
  @Prop({ required: true, trim: true })
  text: string;

  @Prop({ default: false })
  isCorrect: boolean;
}
const McqOptionSchema = SchemaFactory.createForClass(McqOption);

@Schema({ _id: false })
export class QuestionMedia {
  @Prop({ enum: ['audio', 'image', 'video'], required: true })
  type: 'audio' | 'image' | 'video';

  @Prop({ required: true })
  key: string; // مفتاح S3

  @Prop()
  url?: string; // رابط بناءي (مش ضروري لو private)

  @Prop()
  mime?: string;

  @Prop({ default: 's3' })
  provider?: 's3' | 'cloudinary';
}
const QuestionMediaSchema = SchemaFactory.createForClass(QuestionMedia);

@Schema({ timestamps: true })
export class Question {
  // معلومات أساسية
  @Prop({ required: true, trim: true })
  prompt: string;

  // حقل text كبديل لـ prompt (للتوافق مع التنسيق الجديد)
  @Prop({ trim: true })
  text?: string;

  @Prop({ type: String, enum: Object.values(QuestionType), required: true })
  qType: QuestionType;

  // MCQ
  @Prop({ type: [McqOptionSchema], default: undefined })
  options?: McqOption[];

  // الإجابة الصحيحة (يتم تحديدها تلقائياً من أول option مع isCorrect = true)
  @Prop({ trim: true })
  correctAnswer?: string;

  // شرح السؤال
  @Prop({ trim: true })
  explanation?: string;

  // مستوى الصعوبة
  @Prop({ type: String, enum: Object.values(QuestionDifficulty) })
  difficulty?: QuestionDifficulty;

  // TRUE/FALSE
  @Prop()
  answerKeyBoolean?: boolean;

  // FILL
  @Prop()
  fillExact?: string;

  @Prop({ type: [String], default: undefined })
  regexList?: string[];

  // MATCH
  @Prop({ type: [[String, String]], default: undefined })
  answerKeyMatch?: [string, string][]; // أزواج [left, right]

  // REORDER
  @Prop({ type: [String], default: undefined })
  answerKeyReorder?: string[]; // ترتيب صحيح

  // ميتاداتا وفلاتر
  @Prop({ trim: true })
  provider?: string;

  @Prop({ trim: true })
  section?: string;

  @Prop({ trim: true })
  level?: string;

  @Prop({ type: [String], index: true, default: [] })
  tags: string[]; // يمكن استخدام tags للصعوبة أيضاً: ["easy"], ["medium"], ["hard"]

  // حالة
  @Prop({ type: String, enum: Object.values(QuestionStatus), default: QuestionStatus.DRAFT })
  status: QuestionStatus;

  // مالك/منشئ (اختياري - للتحكم في الصلاحيات)
  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  // وسائط
  @Prop({ type: QuestionMediaSchema, required: false })
  media?: QuestionMedia;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);

// فهارس للأداء
QuestionSchema.index({ provider: 1, level: 1 });
QuestionSchema.index({ section: 1, level: 1 });
QuestionSchema.index({ status: 1, qType: 1 });
QuestionSchema.index({ prompt: 'text' }); // بحث نصي

// تحققات على مستوى السكيمة (أمان إضافي)
QuestionSchema.pre('validate', function (next) {
  const q = this as QuestionDocument;

  if (q.qType === QuestionType.MCQ) {
    if (!Array.isArray(q.options) || q.options.length < 2) {
      return next(new Error('MCQ requires at least 2 options'));
    }
    const correct = q.options.filter((o) => !!o.isCorrect).length;
    if (correct < 1) return next(new Error('MCQ must have at least one correct option'));
  }

  if (q.qType === QuestionType.TRUE_FALSE) {
    if (typeof q.answerKeyBoolean !== 'boolean') {
      return next(new Error('TRUE_FALSE requires boolean answerKeyBoolean'));
    }
    if (q.options && q.options.length) {
      return next(new Error('TRUE_FALSE should not include options'));
    }
  }

  if (q.qType === QuestionType.FILL) {
    const hasExact = typeof q.fillExact === 'string' && q.fillExact.trim().length > 0;
    const hasRegex = Array.isArray(q.regexList) && q.regexList.length > 0;
    if (!hasExact && !hasRegex) {
      return next(new Error('FILL requires fillExact or regexList'));
    }
  }

  next();
});
