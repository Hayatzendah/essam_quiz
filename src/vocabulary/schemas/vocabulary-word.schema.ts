import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { VocabularyWordMeaning, VocabularyWordMeaningSchema } from './vocabulary-word-meaning.schema';

export type VocabularyWordDocument = VocabularyWord & Document;

@Schema({ timestamps: true, collection: 'vocabularywords' })
export class VocabularyWord {
  @Prop({ type: Types.ObjectId, ref: 'VocabularyTopic', required: true, index: true })
  topicId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  word: string;

  @Prop({ trim: true })
  meaning?: string; // للتوافق مع البيانات القديمة (optional)

  @Prop({ type: [VocabularyWordMeaningSchema], default: [] })
  meanings?: VocabularyWordMeaning[]; // الصيغة الجديدة: array من meanings

  @Prop({ trim: true })
  exampleSentence?: string;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;
}

export const VocabularyWordSchema = SchemaFactory.createForClass(VocabularyWord);




















