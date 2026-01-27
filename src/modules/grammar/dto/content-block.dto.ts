import { IsString, IsEnum, IsObject, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ContentBlockType, ExerciseQuestionType } from '../schemas/content-block.schema';

// DTOs للبيانات حسب type (للتوثيق فقط)
export class IntroBlockData {
  @ApiProperty({ description: 'نص المقدمة' })
  text: string;
}

export class ImageBlockData {
  @ApiProperty({ description: 'رابط الصورة' })
  url: string;

  @ApiProperty({ required: false, description: 'نص بديل للصورة' })
  alt?: string;

  @ApiProperty({ required: false, description: 'عنوان الصورة' })
  caption?: string;
}

export class TableBlockData {
  @ApiProperty({ description: 'عنوان الجدول', required: false })
  title?: string;

  @ApiProperty({ description: 'رؤوس الأعمدة', type: [String] })
  headers: string[];

  @ApiProperty({ 
    description: 'صفوف الجدول', 
    type: 'array',
    items: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  })
  rows: string[][];
}

export class YoutubeBlockData {
  @ApiProperty({ description: 'معرف فيديو YouTube' })
  videoId: string;

  @ApiProperty({ required: false, description: 'عنوان الفيديو' })
  title?: string;
}

// 🔥 سؤال واحد في التمرين المضمّن
export class ExerciseQuestion {
  @ApiProperty({ description: 'نص السؤال' })
  prompt: string;

  @ApiProperty({ enum: ExerciseQuestionType, description: 'نوع السؤال' })
  type: ExerciseQuestionType;

  @ApiProperty({
    required: false,
    description: 'الخيارات (لأسئلة الاختيار من متعدد)',
    type: [String],
  })
  options?: string[];

  @ApiProperty({ description: 'الإجابة الصحيحة' })
  correctAnswer: string;

  @ApiProperty({ required: false, description: 'شرح الإجابة' })
  explanation?: string;
}

// 🔥 بيانات التمرين المضمّن
export class ExerciseBlockData {
  @ApiProperty({ required: false, description: 'عنوان التمرين' })
  title?: string;

  @ApiProperty({
    description: 'أسئلة التمرين',
    type: [ExerciseQuestion],
  })
  questions: ExerciseQuestion[];

  @ApiProperty({ required: false, description: 'إظهار النتيجة فوراً بعد كل سؤال', default: true })
  showResultsImmediately?: boolean;

  @ApiProperty({ required: false, description: 'السماح بإعادة المحاولة', default: true })
  allowRetry?: boolean;
}

// DTO رئيسي للـ ContentBlock
export class ContentBlockDto {
  @ApiProperty({ description: 'معرف فريد للـ block' })
  @IsString()
  id: string;

  @ApiProperty({ enum: ContentBlockType, description: 'نوع الـ block' })
  @IsEnum(ContentBlockType)
  type: ContentBlockType;

  @ApiProperty({
    description: 'بيانات الـ block (تختلف حسب type)',
    oneOf: [
      { $ref: '#/components/schemas/IntroBlockData' },
      { $ref: '#/components/schemas/ImageBlockData' },
      { $ref: '#/components/schemas/TableBlockData' },
      { $ref: '#/components/schemas/YoutubeBlockData' },
      { $ref: '#/components/schemas/ExerciseBlockData' },
    ],
  })
  @IsObject()
  @Transform(({ value }) => {
    // Transform data to plain object to allow all properties
    // This prevents "should not exist" error from ValidationPipe
    return value && typeof value === 'object' ? value : value;
  })
  // ⚠️ مهم: لا نستخدم ValidateNested هنا لأن data يختلف حسب type
  // Validation يتم في service بناءً على type (validateContentBlocks method)
  // استخدام any للسماح بجميع properties داخل data object
  data: any;
}
