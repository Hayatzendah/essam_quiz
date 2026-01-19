import { IsMongoId, IsNotEmpty, IsOptional, IsString, IsBoolean, IsArray, ValidateNested, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { VocabularyWordMeaningDto } from './vocabulary-word-meaning.dto';

export class CreateVocabularyWordDto {
  @ApiProperty({ description: 'معرف الموضوع' })
  @IsNotEmpty()
  @IsMongoId()
  topicId: string;

  @ApiProperty({ description: 'الكلمة الألمانية (يمكن أن تحتوي على صيغ متعددة مفصولة بـ /)' })
  @IsNotEmpty()
  @IsString()
  word: string;

  @ApiProperty({ 
    required: false, 
    description: 'المعنى كـ string مفصولة بـ / (للتوافق مع البيانات القديمة) - مثال: "بيت / house / maison"' 
  })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => !o.meanings || (Array.isArray(o.meanings) && o.meanings.length === 0))
  @IsNotEmpty({ message: 'Either meaning or meanings must be provided' })
  meaning?: string;

  @ApiProperty({ 
    required: false, 
    type: [VocabularyWordMeaningDto],
    description: 'مصفوفة المعاني (الصيغة الجديدة) - مثال: [{text: "بيت", language: "ar"}, {text: "house", language: "en"}]' 
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VocabularyWordMeaningDto)
  @ValidateIf((o) => !o.meaning || o.meaning.trim() === '')
  meanings?: VocabularyWordMeaningDto[];

  @ApiProperty({ required: false, description: 'مثال على استخدام الكلمة في جملة' })
  @IsOptional()
  @IsString()
  exampleSentence?: string;

  @ApiProperty({ required: false, description: 'حالة الكلمة (نشطة/غير نشطة)' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}




















