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
  INTERACTIVE_TEXT = 'interactive_text', // أسئلة النص التفاعلي (فراغات متعددة + ترتيب)
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

export enum QuestionCategory {
  GENERAL = 'general',
  STATE = 'state',
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

  @Prop({ trim: true })
  description?: string; // وصف الصورة (يظهر تحت الصورة في الفرونت)
}
const QuestionMediaSchema = SchemaFactory.createForClass(QuestionMedia);

// Schema للفراغات التفاعلية (Fill-in-the-blanks)
@Schema({ _id: false })
export class InteractiveBlank {
  @Prop({ required: true, trim: true })
  id: string; // a, b, c, ... حتى 10

  @Prop({ required: true, enum: ['dropdown', 'select', 'textInput'] })
  type: 'dropdown' | 'select' | 'textInput';

  @Prop({ type: [String], required: true })
  correctAnswers: string[]; // إجابات صحيحة متعددة

  @Prop({ type: [String], default: undefined })
  choices?: string[]; // مطلوب إذا type = 'dropdown' أو 'select' (legacy - للتوافق)

  @Prop({ type: [String], default: undefined })
  options?: string[]; // مطلوب إذا type = 'dropdown' أو 'select' (الشكل الجديد)

  @Prop({ trim: true, default: undefined })
  hint?: string; // نص تلميح اختياري
}
const InteractiveBlankSchema = SchemaFactory.createForClass(InteractiveBlank);

// Schema لأجزاء الترتيب (Reorder)
@Schema({ _id: false })
export class ReorderPart {
  @Prop({ required: true, trim: true })
  id: string; // 1, 2, 3, ...

  @Prop({ required: true, trim: true })
  text: string; // نص الجزء

  @Prop({ required: true, type: Number, min: 1 })
  order: number; // الترتيب الصحيح (1-based)
}
const ReorderPartSchema = SchemaFactory.createForClass(ReorderPart);

@Schema({ _id: false })
export class InteractiveReorder {
  @Prop({ type: [ReorderPartSchema], required: true })
  parts: ReorderPart[];
}
const InteractiveReorderSchema = SchemaFactory.createForClass(InteractiveReorder);

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

  // INTERACTIVE_TEXT (أسئلة النص التفاعلي)
  @Prop({ trim: true })
  interactiveText?: string; // النص التفاعلي مع placeholders مثل {{a}}, {{b}}

  @Prop({ type: [InteractiveBlankSchema], default: undefined })
  interactiveBlanks?: InteractiveBlank[]; // للفراغات المتعددة (fill-in-the-blanks)

  @Prop({ type: InteractiveReorderSchema, default: undefined })
  interactiveReorder?: InteractiveReorder; // لترتيب الأجزاء (drag & drop)

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

  // وسائط (يمكن أن تكون صورة واحدة أو مصفوفة من الصور)
  @Prop({ type: QuestionMediaSchema, required: false })
  media?: QuestionMedia;

  // مصفوفة من الصور (للدعم المتعدد)
  @Prop({ type: [QuestionMediaSchema], required: false })
  images?: QuestionMedia[];

  // رابط ملف الصوت (لأسئلة الاستماع) - للتوافق مع الكود القديم
  @Prop({ trim: true })
  audioUrl?: string;

  // ربط بكليب الاستماع (لأسئلة Hören)
  @Prop({ type: Types.ObjectId, ref: 'ListeningClip', required: false, index: true })
  listeningClipId?: Types.ObjectId;

  // ربط بفقرة قراءة مشتركة (لأسئلة Lesen)
  @Prop({ type: Types.ObjectId, required: false, index: true })
  readingPassageId?: Types.ObjectId;

  @Prop({ type: String, trim: true })
  readingPassage?: string;

  // بطاقات معلومات القراءة (لأسئلة Lesen - مثل الإعلانات والكورسات)
  @Prop({ type: [{ title: { type: String, required: true, trim: true }, content: { type: String, required: true, trim: true }, color: { type: String, trim: true } }], default: undefined })
  readingCards?: { title: string; content: string; color?: string }[];

  // تخطيط بطاقات القراءة: أفقي (بطاقة بعرض كامل) أو عمودي (بطاقات جنب بعض)
  @Prop({ type: String, enum: ['horizontal', 'vertical'], trim: true })
  cardsLayout?: string;

  // علامة للأسئلة الوهمية (محتوى فقط بدون سؤال فعلي)
  @Prop({ type: Boolean, default: false })
  contentOnly?: boolean;

  // بلوكات المحتوى المرنة (Sprechen وغيرها) - فقرات، صور، بطاقات بترتيب مخصص
  @Prop({ type: [{ type: Object }], default: undefined })
  contentBlocks?: Array<{
    type: 'paragraph' | 'image' | 'cards';
    order: number;
    text?: string;
    images?: Array<{ key: string; url: string; mime: string; description?: string }>;
    cards?: Array<{ title: string; texts: Array<{ label?: string; content: string }>; color?: string }>;
    cardsLayout?: string;
  }>;

  // للحقول الخاصة بـ Leben in Deutschland
  @Prop({ type: String, enum: Object.values(ExamSkillEnum), trim: true })
  mainSkill?: ExamSkillEnum;

  @Prop({ 
    type: String, 
    enum: Object.values(QuestionCategory),
    trim: true,
    index: true,
  })
  category?: QuestionCategory; // "general" | "state" - التصنيف الواضح

  @Prop({ trim: true, index: true })
  usageCategory?: string; // "common" | "state_specific" - للتوافق مع البيانات القديمة

  @Prop({ trim: true, index: true })
  state?: string; // للأسئلة الخاصة بالولايات (إلزامي إذا category='state')

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

  if (q.qType === QuestionType.INTERACTIVE_TEXT) {
    // INTERACTIVE_TEXT: يجب أن يكون إما interactiveBlanks أو interactiveReorder (وليس كلاهما)
    const hasBlanks = q.interactiveBlanks && Array.isArray(q.interactiveBlanks) && q.interactiveBlanks.length > 0;
    const hasReorder = q.interactiveReorder && q.interactiveReorder.parts && Array.isArray(q.interactiveReorder.parts) && q.interactiveReorder.parts.length > 0;

    if (!hasBlanks && !hasReorder) {
      return next(new Error('INTERACTIVE_TEXT requires either interactiveBlanks or interactiveReorder'));
    }

    if (hasBlanks && hasReorder) {
      return next(new Error('INTERACTIVE_TEXT cannot have both interactiveBlanks and interactiveReorder'));
    }

    // التحقق من interactiveBlanks
    if (hasBlanks && q.interactiveBlanks) {
      if (!q.text || !q.text.includes('{{')) {
        return next(new Error('INTERACTIVE_TEXT with blanks requires text field with {{id}} placeholders'));
      }
      if (q.interactiveBlanks.length < 3 || q.interactiveBlanks.length > 10) {
        return next(new Error('INTERACTIVE_TEXT blanks must be between 3 and 10'));
      }
      
      // التحقق من كل blank
      const blankIds = new Set<string>();
      for (const blank of q.interactiveBlanks) {
        if (!blank.id || blank.id.length !== 1 || !/[a-z]/.test(blank.id)) {
          return next(new Error(`INTERACTIVE_TEXT blank id must be a single lowercase letter (a-z), found: ${blank.id}`));
        }
        if (blankIds.has(blank.id)) {
          return next(new Error(`INTERACTIVE_TEXT duplicate blank id: ${blank.id}`));
        }
        blankIds.add(blank.id);

        if ((blank.type === 'dropdown' || blank.type === 'select') && (!blank.options || blank.options.length === 0) && (!blank.choices || blank.choices.length === 0)) {
          return next(new Error(`INTERACTIVE_TEXT blank ${blank.id} of type ${blank.type} requires options or choices array`));
        }

        if (!blank.correctAnswers || blank.correctAnswers.length === 0) {
          return next(new Error(`INTERACTIVE_TEXT blank ${blank.id} requires at least one correctAnswer`));
        }

        // التحقق من أن placeholder موجود في النص
        if (!q.text.includes(`{{${blank.id}}}`)) {
          return next(new Error(`INTERACTIVE_TEXT text must contain placeholder {{${blank.id}}}`));
        }
      }
    }

    // التحقق من interactiveReorder
    if (hasReorder && q.interactiveReorder) {
      if (q.interactiveReorder.parts.length < 2) {
        return next(new Error('INTERACTIVE_TEXT reorder must have at least 2 parts'));
      }

      const partIds = new Set<string>();
      const orders = new Set<number>();
      
      for (const part of q.interactiveReorder.parts) {
        if (!part.id || part.id.trim().length === 0) {
          return next(new Error('INTERACTIVE_TEXT reorder part must have an id'));
        }
        if (partIds.has(part.id)) {
          return next(new Error(`INTERACTIVE_TEXT reorder duplicate part id: ${part.id}`));
        }
        partIds.add(part.id);

        if (!part.text || part.text.trim().length === 0) {
          return next(new Error(`INTERACTIVE_TEXT reorder part ${part.id} must have text`));
        }

        if (!part.order || part.order < 1) {
          return next(new Error(`INTERACTIVE_TEXT reorder part ${part.id} must have order >= 1`));
        }
        if (orders.has(part.order)) {
          return next(new Error(`INTERACTIVE_TEXT reorder duplicate order: ${part.order}`));
        }
        orders.add(part.order);
      }

      // التحقق من أن الأرقام متسلسلة من 1
      const sortedOrders = Array.from(orders).sort((a, b) => a - b);
      for (let i = 0; i < sortedOrders.length; i++) {
        if (sortedOrders[i] !== i + 1) {
          return next(new Error('INTERACTIVE_TEXT reorder orders must be sequential starting from 1'));
        }
      }
    }

    // ممنوع fields أخرى
    if (q.options && q.options.length > 0) {
      return next(new Error('INTERACTIVE_TEXT should not include options'));
    }
    if (q.answerKeyBoolean !== undefined) {
      return next(new Error('INTERACTIVE_TEXT should not have answerKeyBoolean'));
    }
    if (q.fillExact || (q.regexList && q.regexList.length > 0)) {
      return next(new Error('INTERACTIVE_TEXT should not have fillExact or regexList'));
    }
  }

  next();
});

// تعيين correctAnswer تلقائياً من الخيارات لأسئلة MCQ
QuestionSchema.pre('save', function (next) {
  const q = this as QuestionDocument;

  // لأسئلة MCQ: استخراج correctAnswer من أول option مع isCorrect = true
  if (q.qType === QuestionType.MCQ && q.options && Array.isArray(q.options) && q.options.length > 0) {
    const correctOption = q.options.find((opt) => opt.isCorrect === true);
    if (correctOption) {
      // تحديث correctAnswer دائماً من الخيارات لضمان التوافق
      q.correctAnswer = correctOption.text;
    }
  }

  // أيضاً: تعيين text من prompt إذا لم يكن موجوداً (للتوافق)
  if (q.prompt && !q.text) {
    q.text = q.prompt;
  }

  next();
});