import { IsString, IsOptional, IsArray, MinLength, IsEnum, IsMongoId, ValidateNested } from 'class-validator';
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

  @ApiProperty({ enum: ['A1', 'A2', 'B1', 'B2', 'C1'], description: 'مستوى الموضوع' })
  @IsString()
  @IsEnum(['A1', 'A2', 'B1', 'B2', 'C1'])
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

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

  @ApiProperty({ required: false, type: [ContentBlockDto], description: 'مصفوفة content blocks (البنية الجديدة)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentBlockDto)
  contentBlocks?: ContentBlockDto[];

  @ApiProperty({ required: false, description: 'معرف الامتحان المرتبط' })
  @IsOptional()
  @IsMongoId()
  examId?: string;

  @ApiProperty({ required: false, description: 'عنوان القسم في الامتحان' })
  @IsOptional()
  @IsString()
  sectionTitle?: string;
}



