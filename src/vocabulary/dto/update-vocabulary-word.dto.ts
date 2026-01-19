import { IsMongoId, IsOptional, IsString, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { VocabularyWordMeaningDto } from './vocabulary-word-meaning.dto';

export class UpdateVocabularyWordDto {
  @ApiProperty({ required: false, description: 'معرف الموضوع' })
  @IsOptional()
  @IsMongoId()
  topicId?: string;

  @ApiProperty({ required: false, description: 'الكلمة الألمانية' })
  @IsOptional()
  @IsString()
  word?: string;

  @ApiProperty({ 
    required: false, 
    description: 'المعنى كـ string مفصولة بـ / (للتوافق مع البيانات القديمة)' 
  })
  @IsOptional()
  @IsString()
  meaning?: string;

  @ApiProperty({ 
    required: false, 
    type: [VocabularyWordMeaningDto],
    description: 'مصفوفة المعاني (الصيغة الجديدة)' 
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VocabularyWordMeaningDto)
  meanings?: VocabularyWordMeaningDto[];

  @ApiProperty({ required: false, description: 'مثال على استخدام الكلمة' })
  @IsOptional()
  @IsString()
  exampleSentence?: string;

  @ApiProperty({ required: false, description: 'حالة الكلمة' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}




















