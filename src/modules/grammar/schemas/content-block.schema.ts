import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ContentBlockDocument = ContentBlock & Document;

export enum ContentBlockType {
  INTRO = 'intro',
  IMAGE = 'image',
  TABLE = 'table',
  YOUTUBE = 'youtube',
}

@Schema({ _id: false })
export class ContentBlock {
  @Prop({ type: String, required: true })
  id: string; // UUID أو unique identifier

  @Prop({ type: String, enum: Object.values(ContentBlockType), required: true })
  type: ContentBlockType;

  @Prop({ type: Object, required: true })
  data: any; // البيانات تختلف حسب type
}

export const ContentBlockSchema = SchemaFactory.createForClass(ContentBlock);
