import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ProviderEnum } from '../../common/enums/provider.enum';
import { ExamSkillEnum } from '../../common/enums';

export type QuestionDocument = Question & Document;

export enum QuestionType {
  MCQ = 'mcq',
  FILL = 'fill',
  TRUE_FALSE = 'true_false',
  MATCH = 'match',
  REORDER = 'reorder',
  LISTEN = 'listen',
  FREE_TEXT = 'free_text', // أسئلة الكتابة (Schreiben)
  SPEAKING = 'speaking', // أسئلة التحدث (Sprechen)
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

@Schema({ _id: true }) // تمكين _id للسماح بحفظ optionId
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
  @Prop({ type: [String], default: undefined })
  fillExact?: string | string[];

  @Prop({ type: [String], default: [] })
  regexList?: string[];

  // MATCH
  @Prop({ type: [[String, String]], default: undefined })
  answerKeyMatch?: [string, string][]; // أزواج [left, right]

  // REORDER
  @Prop({ type: [String], default: undefined })
  answerKeyReorder?: string[]; // ترتيب صحيح

  // FREE_TEXT (أسئلة الكتابة)
  @Prop({ trim: true })
  sampleAnswer?: string; // نموذج إجابة (للمعلم فقط - للتصحيح اليدوي)

  @Prop({ type: Number, min: 0 })
  minWords?: number; // حد أدنى للكلمات (اختياري)

  @Prop({ type: Number, min: 1 })
  maxWords?: number; // حد أقصى للكلمات (اختياري)

  // SPEAKING (أسئلة التحدث)
  @Prop({ trim: true })
  modelAnswerText?: string; // نموذج إجابة (للمعلم فقط - للتصحيح اليدوي)

  @Prop({ type: Number, min: 0 })
  minSeconds?: number; // حد أدنى للثواني (اختياري)

  @Prop({ type: Number, min: 1 })
  maxSeconds?: number; // حد أقصى للثواني (اختياري)

  // ميتاداتا وفلاتر
  @Prop({ 
    trim: true,
    enum: Object.values(ProviderEnum),
  })
  provider?: ProviderEnum | string;

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

  // رابط ملف الصوت (لأسئلة الاستماع) - للتوافق مع الكود القديم
  @Prop({ trim: true })
  audioUrl?: string;

  // ربط بكليب الاستماع (لأسئلة Hören)
  @Prop({ type: Types.ObjectId, ref: 'ListeningClip', required: false, index: true })
  listeningClipId?: Types.ObjectId;

  // للحقول الخاصة بـ Leben in Deutschland
  @Prop({ type: String, enum: Object.values(ExamSkillEnum), trim: true })
  mainSkill?: ExamSkillEnum;

  @Prop({ trim: true })
  usageCategory?: string; // "common" | "state_specific"

  @Prop({ trim: true })
  state?: string; // للأسئلة الخاصة بالولايات

  // ربط السؤال بامتحان (لأسئلة Create Question with Exam)
  @Prop({ type: Types.ObjectId, ref: 'Exam', index: true })
  examId?: Types.ObjectId;

  @Prop({ trim: true })
  sectionTitle?: string; // عنوان القسم (مثل "Lesen – Teil 1: Text über Anna")
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
    // fillExact يمكن أن يكون string أو array
    const hasExact = 
      (typeof q.fillExact === 'string' && q.fillExact.trim().length > 0) ||
      (Array.isArray(q.fillExact) && q.fillExact.length > 0 && q.fillExact.some((item: any) => item && String(item).trim().length > 0));
    const hasRegex = Array.isArray(q.regexList) && q.regexList.length > 0;
    if (!hasExact && !hasRegex) {
      return next(new Error('FILL requires fillExact or regexList'));
    }
  }

  if (q.qType === QuestionType.FREE_TEXT) {
    // FREE_TEXT: ممنوع يكون فيه options أو answerKeyBoolean
    if (q.options && q.options.length > 0) {
      return next(new Error('FREE_TEXT should not include options'));
    }
    if (q.answerKeyBoolean !== undefined) {
      return next(new Error('FREE_TEXT should not have answerKeyBoolean'));
    }
    if (q.fillExact || (q.regexList && q.regexList.length > 0)) {
      return next(new Error('FREE_TEXT should not have fillExact or regexList'));
    }
    // التحقق من minWords و maxWords إذا كانا موجودين
    if (q.minWords !== undefined && q.maxWords !== undefined && q.minWords > q.maxWords) {
      return next(new Error('FREE_TEXT minWords must be less than or equal to maxWords'));
    }
  }

  next();
});
