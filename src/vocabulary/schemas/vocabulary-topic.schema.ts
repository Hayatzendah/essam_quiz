import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VocabularyTopicDocument = VocabularyTopic & Document;

export type VocabularyLevel = string;

@Schema({ timestamps: true, collection: 'vocabularytopics' })
export class VocabularyTopic {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ type: String, required: true, index: true })
  level: VocabularyLevel;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  icon?: string;

  @Prop({ trim: true, unique: true, sparse: true, index: true })
  slug?: string;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  @Prop({ type: Number, default: 0 })
  position: number;
}

export const VocabularyTopicSchema = SchemaFactory.createForClass(VocabularyTopic);

VocabularyTopicSchema.index({ level: 1, position: 1 });

