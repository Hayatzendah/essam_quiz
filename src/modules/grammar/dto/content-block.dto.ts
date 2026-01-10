import { IsString, IsEnum, IsObject, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ContentBlockType } from '../schemas/content-block.schema';

// DTOs للبيانات حسب type
export class IntroBlockData {
  @ApiProperty({ description: 'نص المقدمة' })
  @IsString()
  @IsNotEmpty()
  text: string;
}

export class ImageBlockData {
  @ApiProperty({ description: 'رابط الصورة' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({ required: false, description: 'نص بديل للصورة' })
  @IsString()
  alt?: string;

  @ApiProperty({ required: false, description: 'عنوان الصورة' })
  @IsString()
  caption?: string;
}

export class TableBlockData {
  @ApiProperty({ description: 'عنوان الجدول', required: false })
  @IsString()
  title?: string;

  @ApiProperty({ description: 'رؤوس الأعمدة', type: [String] })
  @IsString({ each: true })
  headers: string[];

  @ApiProperty({ description: 'صفوف الجدول', type: [[String]] })
  @IsString({ each: true })
  rows: string[][];
}

export class YoutubeBlockData {
  @ApiProperty({ description: 'معرف فيديو YouTube' })
  @IsString()
  @IsNotEmpty()
  videoId: string;

  @ApiProperty({ required: false, description: 'عنوان الفيديو' })
  @IsString()
  title?: string;
}

// DTO رئيسي للـ ContentBlock
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
  @ValidateNested()
  @Type(() => Object)
  data: IntroBlockData | ImageBlockData | TableBlockData | YoutubeBlockData;
}
