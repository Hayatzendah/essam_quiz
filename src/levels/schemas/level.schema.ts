import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LevelDocument = Level & Document;

@Schema({ timestamps: true, collection: 'levels' })
export class Level {
  @Prop({ required: true, trim: true, unique: true })
  name: string;

  @Prop({ trim: true })
  label?: string;

  @Prop({ type: Boolean, default: false })
  isDefault: boolean;

  @Prop({ type: Number, default: 0 })
  position: number;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: [String], default: ['grammatik', 'wortschatz', 'pruefungen', 'leben_in_deutschland'] })
  sections: string[];
}

export const LevelSchema = SchemaFactory.createForClass(Level);

LevelSchema.index({ position: 1 });
LevelSchema.index({ name: 1 }, { unique: true });
