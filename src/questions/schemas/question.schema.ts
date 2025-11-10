import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type QuestionDocument = Question & Document;

export enum QuestionType {
  MCQ = 'mcq',
  FILL = 'fill',
  TRUE_FALSE = 'true_false',
}

export enum QuestionStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Schema({ _id: false })
export class McqOption {
  @Prop({ required: true, trim: true })
  text: string;

  @Prop({ default: false })
  isCorrect: boolean;
}
const McqOptionSchema = SchemaFactory.createForClass(McqOption);

@Schema({ timestamps: true })
export class Question {
  // معلومات أساسية
  @Prop({ required: true, trim: true })
  prompt: string;

  @Prop({ type: String, enum: Object.values(QuestionType), required: true })
  qType: QuestionType;

  // MCQ
  @Prop({ type: [McqOptionSchema], default: undefined })
  options?: McqOption[];

  // TRUE/FALSE
  @Prop()
  answerKeyBoolean?: boolean;

  // FILL
  @Prop()
  fillExact?: string;

  @Prop({ type: [String], default: undefined })
  regexList?: string[];

  // ميتاداتا وفلاتر
  @Prop({ trim: true })
  provider?: string;

  @Prop({ trim: true })
  section?: string;

  @Prop({ trim: true })
  level?: string;

  @Prop({ trim: true })
  difficulty?: 'easy' | 'medium' | 'hard';

  @Prop({ type: [String], index: true, default: [] })
  tags: string[];

  // حالة/نسخة
  @Prop({ type: String, enum: Object.values(QuestionStatus), default: QuestionStatus.DRAFT })
  status: QuestionStatus;

  @Prop({ default: 1 })
  version: number;

  // مالك/منشئ
  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  // شرح/توضيح للسؤال (للسياسات)
  @Prop({ trim: true })
  explanation?: string;
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
    const correct = q.options.filter(o => !!o.isCorrect).length;
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
