import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, SchemaTypes } from 'mongoose';
import type {
  QuestionDifficulty,
  QuestionLevel,
  QuestionProvider,
  QuestionSection,
  QuestionStatus,
  QuestionType,
} from '../../common/enums';

export type QuestionDocument = Question & Document;

class Media {
  @Prop() audioUrl?: string;
  @Prop() imageUrl?: string;
  @Prop() videoUrl?: string;
  @Prop() durationSec?: number;
}
const MediaSchema = SchemaFactory.createForClass(Media);

class OptionItem {
  @Prop({ trim: true }) text: string;
  @Prop({ default: false }) isCorrect?: boolean;
  @Prop() explanation?: string;
}
const OptionItemSchema = SchemaFactory.createForClass(OptionItem);

// تعريفات answerKey حسب نوع السؤال

/**
 * true_false → answerKey: boolean
 */
class TrueFalseAnswerKey {
  @Prop({ type: SchemaTypes.Mixed })
  value: boolean;
}
const TrueFalseAnswerKeySchema = SchemaFactory.createForClass(TrueFalseAnswerKey);

/**
 * fill/short_answer → answerKey: {
 *   fillExact?: string[];      // إجابات مطابقة تمامًا
 *   regexList?: string[];      // Regex patterns
 * }
 */
class FillAnswerKey {
  @Prop({ type: [String], default: [] })
  fillExact?: string[];

  @Prop({ type: [String], default: [] })
  regexList?: string[];
}
const FillAnswerKeySchema = SchemaFactory.createForClass(FillAnswerKey);

/**
 * match → answerKey: {
 *   pairs: { left: string; right: string }[]
 * }
 */
class MatchPair {
  @Prop({ trim: true, required: true })
  left: string;

  @Prop({ trim: true, required: true })
  right: string;
}
const MatchPairSchema = SchemaFactory.createForClass(MatchPair);

class MatchAnswerKey {
  @Prop({ type: [MatchPairSchema], required: true, _id: false })
  pairs: MatchPair[];
}
const MatchAnswerKeySchema = SchemaFactory.createForClass(MatchAnswerKey);

/**
 * reorder → answerKey: {
 *   order: (string | number)[]  // IDs أو نصوص
 * }
 */
class ReorderAnswerKey {
  @Prop({ type: [SchemaTypes.Mixed], required: true })
  order: (string | number)[];
}
const ReorderAnswerKeySchema = SchemaFactory.createForClass(ReorderAnswerKey);

/**
 * writing/speaking → answerKey: Rubric
 * {
 *   writingRubric?: {
 *     criteria: { name: string; max: number }[];
 *     total: number;
 *   };
 *   speakingRubric?: {
 *     criteria: { name: string; max: number }[];
 *     total: number;
 *   };
 * }
 */
class RubricCriterion {
  @Prop({ trim: true, required: true })
  name: string;

  @Prop({ type: Number, required: true, min: 0 })
  max: number;
}
const RubricCriterionSchema = SchemaFactory.createForClass(RubricCriterion);

class Rubric {
  @Prop({ type: [RubricCriterionSchema], required: true, _id: false })
  criteria: RubricCriterion[];

  @Prop({ type: Number, required: true, min: 0 })
  total: number;
}
const RubricSchema = SchemaFactory.createForClass(Rubric);

class RubricAnswerKey {
  @Prop({ type: RubricSchema, _id: false })
  writingRubric?: Rubric;

  @Prop({ type: RubricSchema, _id: false })
  speakingRubric?: Rubric;
}
const RubricAnswerKeySchema = SchemaFactory.createForClass(RubricAnswerKey);

@Schema({ timestamps: true, collection: 'questions' })
export class Question {
  @Prop({ required: true, trim: true })
  prompt: string;

  @Prop({ type: MediaSchema, _id: false })
  media?: Media;

  @Prop({ type: [OptionItemSchema], default: [], _id: false })
  options?: OptionItem[];

  // تصنيفات
  @Prop({ type: String, enum: ['A1', 'A2', 'B1', 'B2'], index: true })
  level?: QuestionLevel;

  @Prop({ type: String, enum: ['General', 'DTZ', 'Other'], index: true })
  provider?: QuestionProvider;

  @Prop({
    type: String,
    enum: ['LanguageBlocks', 'Listening', 'Reading', 'Writing', 'Speaking'],
    index: true,
  })
  section?: QuestionSection;

  @Prop({
    type: String,
    enum: ['mcq', 'true_false', 'fill', 'match', 'reorder', 'short_answer', 'writing', 'speaking'],
    required: true,
  })
  qType: QuestionType;

  @Prop({ type: String, enum: ['easy', 'med', 'hard'], default: 'med', index: true })
  difficulty: QuestionDifficulty;

  @Prop({ type: [String], default: [], index: true })
  tags: string[];

  @Prop({ type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true })
  status: QuestionStatus;

  /**
   * answerKey مرن — يختلف حسب qType:
   * 
   * mcq → يتم التصحيح من options[].isCorrect
   * 
   * true_false → boolean
   * 
   * fill/short_answer → {
   *   fillExact?: string[];      // إجابات مطابقة تمامًا
   *   regexList?: string[];      // Regex patterns
   * }
   * 
   * match → {
   *   pairs: { left: string; right: string }[]
   * }
   * 
   * reorder → {
   *   order: (string | number)[]  // IDs أو نصوص
   * }
   * 
   * writing/speaking → {
   *   writingRubric?: {
   *     criteria: { name: string; max: number }[];
   *     total: number;
   *   };
   *   speakingRubric?: {
   *     criteria: { name: string; max: number }[];
   *     total: number;
   *   };
   * }
   */
  @Prop({ type: SchemaTypes.Mixed })
  answerKey: any;

  // رقم نسخة السؤال
  @Prop({ type: Number, default: 1 })
  version: number;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);

// حوكمة النسخ: زود النسخة لما يحصل تعديل جوهري
QuestionSchema.pre<QuestionDocument>('save', function (next) {
  if (this.isModified('prompt') || this.isModified('options') || this.isModified('answerKey')) {
    this.version = (this.version || 1) + 1;
  }
  next();
});

// فهارس مركّبة + فهرس نصي
QuestionSchema.index({ level: 1, provider: 1, section: 1, status: 1 });
QuestionSchema.index({ tags: 1 });
QuestionSchema.index({ prompt: 'text', 'options.text': 'text' });
