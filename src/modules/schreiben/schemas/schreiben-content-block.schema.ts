import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SchreibenContentBlockDocument = SchreibenContentBlock & Document;

// أنواع البلوكات في الكتابة
export enum SchreibenBlockType {
  TEXT = 'text',           // فقرة نصية (تعليمات، وصف السيناريو)
  FORM = 'form',           // استمارة مع حقول
  IMAGE = 'image',         // صورة
}

// أنواع حقول الاستمارة
export enum FormFieldType {
  TEXT_INPUT = 'text_input',     // حقل فارغ - الطالب يعبيه
  PREFILLED = 'prefilled',       // نص معبأ مسبقاً (readonly)
  SELECT = 'select',             // اختيار واحد (radio buttons)
  MULTISELECT = 'multiselect',   // اختيار متعدد (checkboxes)
}

// حقل في الاستمارة
@Schema({ _id: false })
export class FormField {
  @Prop({ type: String, required: true })
  id: string; // معرف فريد للحقل

  @Prop({ type: Number, required: true })
  number: number; // رقم الحقل (1, 2, 3, ...)

  @Prop({ type: String, required: true, trim: true })
  label: string; // عنوان الحقل (مثل: Vorname, Nachname)

  @Prop({ type: String, enum: Object.values(FormFieldType), required: true })
  fieldType: FormFieldType;

  @Prop({ type: String, trim: true })
  value?: string; // القيمة (للـ prefilled) أو الإجابة الصحيحة (للـ text_input)

  @Prop({ type: [String], default: undefined })
  options?: string[]; // الخيارات (للـ select و multiselect)

  @Prop({ type: [String], default: undefined })
  correctAnswers?: string[]; // الإجابات الصحيحة (للـ select و multiselect)

  @Prop({ type: Boolean, default: true })
  isStudentField: boolean; // true = الطالب يعبي، false = معطى له

  @Prop({ type: String, trim: true })
  hint?: string; // تلميح اختياري
}
export const FormFieldSchema = SchemaFactory.createForClass(FormField);

// بيانات بلوك النص
@Schema({ _id: false })
export class TextBlockData {
  @Prop({ type: String, required: true, trim: true })
  content: string; // المحتوى النصي (يدعم HTML أو Markdown)
}
export const TextBlockDataSchema = SchemaFactory.createForClass(TextBlockData);

// بيانات بلوك الاستمارة
@Schema({ _id: false })
export class FormBlockData {
  @Prop({ type: String, required: true, trim: true })
  title: string; // عنوان الاستمارة (مثل: Reservierungsformular)

  @Prop({ type: [FormFieldSchema], required: true })
  fields: FormField[];
}
export const FormBlockDataSchema = SchemaFactory.createForClass(FormBlockData);

// بيانات بلوك الصورة
@Schema({ _id: false })
export class ImageBlockData {
  @Prop({ type: String, required: true, trim: true })
  src: string; // رابط الصورة أو S3 key

  @Prop({ type: String, trim: true })
  alt?: string; // نص بديل

  @Prop({ type: String, trim: true })
  caption?: string; // تعليق تحت الصورة
}
export const ImageBlockDataSchema = SchemaFactory.createForClass(ImageBlockData);

// البلوك الرئيسي
@Schema({ _id: false })
export class SchreibenContentBlock {
  @Prop({ type: String, required: true })
  id: string; // UUID

  @Prop({ type: String, enum: Object.values(SchreibenBlockType), required: true })
  type: SchreibenBlockType;

  @Prop({ type: Object, required: true })
  data: TextBlockData | FormBlockData | ImageBlockData;
}

export const SchreibenContentBlockSchema = SchemaFactory.createForClass(SchreibenContentBlock);
