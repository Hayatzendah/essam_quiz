import {
  IsString,
  IsOptional,
  IsArray,
  MinLength,
  IsNotEmpty,
  IsMongoId,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ContentBlockDto } from './content-block.dto';

export class CreateGrammarTopicDto {
  @ApiProperty({ description: 'عنوان الموضوع' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiProperty({ required: false, description: 'Slug فريد للموضوع' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  slug?: string;

  @ApiProperty({ description: 'مستوى الموضوع' })
  @IsString()
  @IsNotEmpty()
  level: string;

  @ApiProperty({ required: false, description: 'وصف مختصر' })
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiProperty({ required: false, type: [String], description: 'Tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ required: false, description: 'HTML content (للتوافق مع البيانات القديمة)' })
  @IsOptional()
  @IsString()
  contentHtml?: string;

  @ApiProperty({
    required: false,
    type: [ContentBlockDto],
    description: 'مصفوفة content blocks (البنية الجديدة)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentBlockDto)
  // ⚠️ ملاحظة: validation للـ data داخل contentBlocks يتم في service
  // لأن data يختلف حسب type ولا يمكن استخدام ValidateNested مع discriminator
  contentBlocks?: ContentBlockDto[];

  @ApiProperty({ required: false, description: 'معرف الامتحان المرتبط' })
  @IsOptional()
  @IsMongoId()
  examId?: string;

  @ApiProperty({ required: false, description: 'عنوان القسم في الامتحان' })
  @IsOptional()
  @IsString()
  sectionTitle?: string;

  @ApiProperty({ required: false, description: 'Grammatik = قواعد قديمة، Grammatik-Training = تدريب منفصل' })
  @IsOptional()
  @IsString()
  provider?: string;
}
