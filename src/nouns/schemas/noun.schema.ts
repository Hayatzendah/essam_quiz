import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NounDocument = Noun & Document;

@Schema({ timestamps: true, collection: 'nouns' })
export class Noun {
  @Prop({ required: true, enum: ['der', 'die', 'das'] })
  article: string;

  @Prop({ required: true, trim: true })
  singular: string;

  @Prop({ required: true, trim: true })
  plural: string;

  @Prop({ required: true, type: String, index: true })
  level: string;

  @Prop({ type: Number, default: null, index: true })
  order?: number;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;
}

export const NounSchema = SchemaFactory.createForClass(Noun);
NounSchema.index({ level: 1, order: 1 });
