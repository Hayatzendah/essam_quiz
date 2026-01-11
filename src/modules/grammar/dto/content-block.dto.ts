import { IsString, IsEnum, IsObject, IsNotEmpty } from 'class-validator';
import { Allow } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ContentBlockType } from '../schemas/content-block.schema';

// DTOs للبيانات حسب type (للتوثيق فقط - validation يتم في service)
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

// DTO رئيسي للـ ContentBlock
// ملاحظة: validation للـ data يتم في service بناءً على type
export class ContentBlockDto {
  @ApiProperty({ description: 'معرف فريد للـ block' })
  @IsString()
  @IsNotEmpty()
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
    ],
  })
  @IsObject()
  @Allow() // السماح بجميع properties في data (validation يتم في service بناءً على type)
  // Validation للـ data يتم في service بناءً على type
  // لأن class-validator لا يدعم discriminator بشكل مباشر
  data: IntroBlockData | ImageBlockData | TableBlockData | YoutubeBlockData;
}
