import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VocabularyWordDocument = VocabularyWord & Document;

@Schema({ timestamps: true, collection: 'vocabularywords' })
export class VocabularyWord {
  @Prop({ type: Types.ObjectId, ref: 'VocabularyTopic', required: true, index: true })
  topicId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  word: string;

  @Prop({ required: true, trim: true })
  meaning: string;

  @Prop({ trim: true })
  exampleSentence?: string;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;
}

export const VocabularyWordSchema = SchemaFactory.createForClass(VocabularyWord);





