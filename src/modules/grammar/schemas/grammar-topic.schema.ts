import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

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
  contentHtml?: string;
}

export const GrammarTopicSchema = SchemaFactory.createForClass(GrammarTopic);

// Indexes for performance
GrammarTopicSchema.index({ slug: 1, level: 1 }, { unique: true });
GrammarTopicSchema.index({ level: 1, title: 1 });



