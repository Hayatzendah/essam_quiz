import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ContentBlock, ContentBlockSchema } from './content-block.schema';

export type GrammarTopicDocument = GrammarTopic & Document;

@Schema({ timestamps: true })
export class GrammarTopic {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true, lowercase: true })
  slug: string;

  @Prop({ required: true, trim: true })
  level: string; // A1, A2, B1, B2, C1

  @Prop({ trim: true })
  shortDescription?: string;

  @Prop({ type: [String], default: [] })
  tags?: string[];

  @Prop({ type: String })
  contentHtml?: string; // للتوافق مع البيانات القديمة

  @Prop({ type: [ContentBlockSchema], default: [] })
  contentBlocks?: ContentBlock[]; // البنية الجديدة المرنة

  @Prop({ type: Types.ObjectId, ref: 'Exam', required: false })
  examId?: Types.ObjectId;

  @Prop({ type: String, required: false })
  sectionTitle?: string;

  @Prop({ type: Number, default: 0 })
  position: number; // ترتيب البطاقة داخل المستوى
}

export const GrammarTopicSchema = SchemaFactory.createForClass(GrammarTopic);

// Indexes for performance
GrammarTopicSchema.index({ slug: 1, level: 1 }, { unique: true });
GrammarTopicSchema.index({ level: 1, position: 1, title: 1 });



