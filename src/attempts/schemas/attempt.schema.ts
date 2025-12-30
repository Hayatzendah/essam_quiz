import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AttemptDocument = Attempt & Document;

export enum AttemptStatus {
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  GRADED = 'graded',
}

// نص القراءة لقسم LESEN
@Schema({ _id: false })
export class ReadingText {
  @Prop({ type: Number })
  teil: number;

  @Prop({ type: String })
  content: string;
}
const ReadingTextSchema = SchemaFactory.createForClass(ReadingText);

@Schema({ _id: false })
export class AttemptItem {
  // تعاريف
  @Prop({ type: Types.ObjectId, ref: 'Question', required: true })
  questionId: Types.ObjectId;

  @Prop({ type: String, required: true }) // mcq | fill | true_false | ... (نخزن النوع snapshot)
  qType: string;

  @Prop({ type: Number, default: 1, min: 0 })
  points: number;

  // Snapshot للعرض/التصحيح المستقر
  @Prop() promptSnapshot?: string;
  @Prop({ type: [String], default: undefined }) optionsText?: string[];
  @Prop({ type: [Number], default: undefined }) optionOrder?: number[]; // لو عشوّتنا ترتيب الخيارات
  @Prop({ type: Object, _id: false }) optionsSnapshot?: Array<{
    optionId?: string;
    text: string;
    isCorrect: boolean;
  }>; // snapshot كامل للخيارات مع optionId

  // Media snapshot (روابط مؤقتة للطالب)
  @Prop() mediaType?: 'audio' | 'image' | 'video';
  @Prop() mediaUrl?: string; // presigned URL أو public URL
  @Prop() mediaMime?: string;
  @Prop({ type: Object, _id: false }) mediaSnapshot?: {
    type: 'audio' | 'image' | 'video';
    key: string;
    mime: string;
    url?: string;
    description?: string;
  };
  // مصفوفة من الصور (للدعم المتعدد)
  @Prop({ type: [Object], default: undefined, _id: false }) imagesSnapshot?: Array<{
    type: 'image';
    key: string;
    mime: string;
    url?: string;
    description?: string;
  }>;
  @Prop({ type: Types.ObjectId, ref: 'ListeningClip' }) listeningClipId?: Types.ObjectId; // للرجوع إلى ListeningClip

  // مفاتيح للتصحيح الآلي (لا تُرسل للطالب)
  @Prop() answerKeyBoolean?: boolean; // true_false
  @Prop({ type: [String], default: undefined }) fillExact?: string | string[]; // fill - يمكن أن يكون string أو array
  @Prop({ type: [String], default: undefined }) regexList?: string[]; // fill
  @Prop({ type: [Number], default: undefined }) correctOptionIndexes?: number[]; // mcq
  @Prop({ 
    type: [[String, String]], 
    default: undefined,
    required: false 
  }) answerKeyMatch?: [string, string][]; // match: أزواج [left, right]
  @Prop({ 
    type: [Object], 
    default: undefined,
    required: false,
    _id: false
  }) matchPairs?: Array<{ left: string; right: string }>; // match: pairs للعرض في response
  @Prop({ type: [String], default: undefined }) answerKeyReorder?: string[]; // reorder: ترتيب صحيح

  // INTERACTIVE_TEXT snapshots (للتصحيح)
  @Prop({ type: String, default: undefined }) interactiveTextSnapshot?: string; // النص التفاعلي مع placeholders مثل "Guten Tag! Ich {{a}} Anna. Ich {{b}} aus {{c}} ..."
  @Prop({ type: [Object], default: undefined, _id: false }) interactiveBlanksSnapshot?: Array<{
    id: string;
    type: 'dropdown' | 'select' | 'textInput';
    correctAnswers: string[];
    options?: string[]; // الشكل الجديد - للـ dropdown/select
    choices?: string[]; // للتوافق مع الكود القديم
    hint?: string;
  }>; // snapshot للفراغات التفاعلية
  @Prop({ type: Object, default: undefined, _id: false }) interactiveReorderSnapshot?: {
    parts: Array<{
      id: string;
      text: string;
      order: number;
    }>;
  }; // snapshot لترتيب الأجزاء
  @Prop({ type: String, default: undefined }) textSnapshot?: string; // نص السؤال مع placeholders (legacy - للتوافق)

  // إجابة الطالب (حسب النوع)
  @Prop() studentAnswerText?: string; // fill / short / free_text
  @Prop({ type: Object, default: undefined, _id: false }) studentInteractiveAnswers?: {
    [blankId: string]: string; // إجابات الطالب للفراغات: { "a": "bin", "b": "komme", ... }
  }; // إجابات الفراغات التفاعلية
  @Prop({ type: [String], default: undefined }) studentReorderAnswer?: string[]; // ترتيب الطالب للأجزاء (array of part ids)
  @Prop({ type: [Number], default: undefined }) studentAnswerIndexes?: number[]; // mcq (مؤشرات للخيارات)
  @Prop() studentAnswerBoolean?: boolean; // true_false
  @Prop({ type: [[String, String]], default: undefined }) studentAnswerMatch?: [string, string][]; // match: أزواج [left, right]
  @Prop({ type: [String], default: undefined }) studentAnswerReorder?: string[]; // reorder: ترتيب الطالب
  @Prop() studentAnswerAudioKey?: string; // Sprechen: مفتاح الملف الصوتي المسجل من الطالب
  @Prop() studentAnswerAudioUrl?: string; // Sprechen: رابط الملف الصوتي (presigned URL)
  @Prop({ type: Object, _id: false }) studentRecording?: {
    url: string;
    mime: string;
    durationMs?: number;
  }; // تسجيل صوت الطالب للإجابة

  // نتيجة هذا السؤال
  @Prop({ type: Number, default: 0 }) autoScore: number;
  @Prop({ type: Number, default: 0 }) manualScore: number;
  @Prop({ type: Boolean, default: false }) needsManualReview?: boolean; // يحتاج تصحيح يدوي (FREE_TEXT)
}

const AttemptItemSchema = SchemaFactory.createForClass(AttemptItem);

@Schema({ timestamps: true })
export class Attempt {
  @Prop({ type: Types.ObjectId, ref: 'Exam', index: true, required: true })
  examId: Types.ObjectId;

  @Prop({ type: Number, default: 1, min: 1 })
  examVersion: number; // نسخة الامتحان وقت بدء المحاولة (Exam Versioning)

  @Prop({ type: Types.ObjectId, ref: 'User', index: true, required: true })
  studentId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(AttemptStatus), default: AttemptStatus.IN_PROGRESS })
  status: AttemptStatus;

  @Prop({ type: Number, default: 1, min: 1 })
  attemptCount: number;

  @Prop({ type: Number, default: 0 }) // رقمية مشتقة من SHA-256
  randomSeed: number;

  @Prop({ type: Date, default: () => new Date() })
  startedAt: Date;

  @Prop({ type: Date }) submittedAt?: Date;

  @Prop({ type: Number, default: 0 }) timeUsedSec: number;

  @Prop({ type: Date }) expiresAt?: Date;

  @Prop({ type: [AttemptItemSchema], default: [] })
  items: AttemptItem[];

  @Prop({ type: Number, default: 0 }) totalAutoScore: number;

  @Prop({ type: Number, default: 0 }) totalManualScore: number;

  @Prop({ type: Number, default: 0 }) totalMaxScore: number;

  @Prop({ type: Number, default: 0 }) finalScore: number;

  // للإصدار/السياسات (تنقرأ من الامتحان عند العرض)
  @Prop({ type: Boolean, default: false }) released?: boolean;

  // نص القراءة لقسم LESEN (اختياري)
  @Prop({ type: ReadingTextSchema, _id: false })
  readingText?: ReadingText;

  // هل يحتوي على أسئلة تحتاج تصحيح يدوي (FREE_TEXT)
  @Prop({ type: Boolean, default: false }) hasQuestionsNeedingManualReview?: boolean;
}

export const AttemptSchema = SchemaFactory.createForClass(Attempt);

// فهارس مفيدة
AttemptSchema.index({ examId: 1, studentId: 1, status: 1 });
