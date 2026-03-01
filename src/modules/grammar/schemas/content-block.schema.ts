import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ContentBlockDocument = ContentBlock & Document;

export enum ContentBlockType {
  INTRO = 'intro',
  IMAGE = 'image',
  TABLE = 'table',
  YOUTUBE = 'youtube',
  EXERCISE = 'exercise', // 🔥 تمرين مضمّن في الشرح
}

// أنواع أسئلة التمارين المضمّنة
export enum ExerciseQuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',  // اختيار من متعدد
  FILL_BLANK = 'fill_blank',            // ملء الفراغ
  TRUE_FALSE = 'true_false',            // صح أو خطأ
  WORD_ORDER = 'word_order',            // ترتيب الكلمات
}

// طريقة إدخال الإجابة لأسئلة ترتيب الكلمات
export enum WordOrderInputMode {
  DRAG = 'drag',   // سحب وإفلات
  TYPE = 'type',   // كتابة
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
