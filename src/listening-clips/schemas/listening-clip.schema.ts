import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ProviderEnum } from '../../common/enums/provider.enum';

export type ListeningClipDocument = ListeningClip & Document;

export enum LevelEnum {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
  C2 = 'C2',
}

export enum SkillEnum {
  HOEREN = 'hoeren',
  LESEN = 'lesen',
  SCHREIBEN = 'schreiben',
  SPRECHEN = 'sprechen',
}

@Schema({ timestamps: true })
export class ListeningClip {
  @Prop({ required: true, enum: Object.values(ProviderEnum), index: true })
  provider: ProviderEnum;

  @Prop({ required: true, enum: Object.values(LevelEnum), index: true })
  level: LevelEnum;

  // غالباً دايمًا Hören بس خليه enum عشان لو توسّعتي بعدين
  @Prop({ required: true, enum: Object.values(SkillEnum), default: SkillEnum.HOEREN, index: true })
  skill: SkillEnum;

  @Prop({ required: true, min: 1 })
  teil: number;

  @Prop({ trim: true }) // عنوان اختياري: "Goethe A1 - Hören - Teil 1"
  title?: string;

  @Prop({ required: true })
  audioUrl: string;
}

export const ListeningClipSchema = SchemaFactory.createForClass(ListeningClip);

// Indexes for better query performance
ListeningClipSchema.index({ provider: 1, level: 1, skill: 1, teil: 1 });

