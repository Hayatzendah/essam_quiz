import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ProviderEnum } from '../../../common/enums/provider.enum';
import {
  SchreibenContentBlock,
  SchreibenContentBlockSchema,
} from './schreiben-content-block.schema';

export type SchreibenTaskDocument = SchreibenTask & Document;

export enum SchreibenTaskStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Schema({ timestamps: true, collection: 'schreiben_tasks' })
export class SchreibenTask {
  @Prop({ required: true, trim: true })
  title: string; // عنوان المهمة (مثل: Parkplatzreservierung)

  @Prop({ trim: true })
  description?: string; // وصف المهمة

  @Prop({ type: String, enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], required: true, index: true })
  level: string;

  @Prop({
    type: String,
    enum: Object.values(ProviderEnum),
    index: true,
  })
  provider?: ProviderEnum | string; // Goethe, TELC, ÖSD, etc.

  @Prop({ type: Number, default: 0 })
  position: number; // الترتيب داخل المستوى

  @Prop({ type: [SchreibenContentBlockSchema], default: [] })
  contentBlocks: SchreibenContentBlock[];

  @Prop({ type: String, enum: Object.values(SchreibenTaskStatus), default: SchreibenTaskStatus.DRAFT, index: true })
  status: SchreibenTaskStatus;

  @Prop({ type: Number, min: 0 })
  timeLimitMin?: number; // وقت المهمة بالدقائق (اختياري)

  @Prop({ type: Number, min: 0 })
  maxPoints?: number; // أقصى درجة

  @Prop({ type: [String], default: [] })
  tags?: string[];

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  createdBy?: Types.ObjectId;

  @Prop({ type: String, trim: true })
  instructions?: string; // تعليمات عامة للطالب

  @Prop({ type: String, trim: true })
  successRate?: string; // نسبة النجاح (مثل: "28% (24 von 85)")
}

export const SchreibenTaskSchema = SchemaFactory.createForClass(SchreibenTask);

// فهارس للأداء
SchreibenTaskSchema.index({ level: 1, provider: 1, status: 1 });
SchreibenTaskSchema.index({ level: 1, position: 1 });
