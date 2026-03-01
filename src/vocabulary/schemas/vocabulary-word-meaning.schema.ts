import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VocabularyWordMeaningDocument = VocabularyWordMeaning & Document;

@Schema({ _id: false })
export class VocabularyWordMeaning {
  @Prop({ required: true, trim: true })
  text: string;

  @Prop({ required: true, trim: true })
  language: string; // 'ar', 'en', 'fr', etc.
}

export const VocabularyWordMeaningSchema = SchemaFactory.createForClass(VocabularyWordMeaning);
