import { IsMongoId, IsNotEmpty, IsArray, IsString, ValidateNested, IsOptional, ValidateIf, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { VocabularyWordMeaningDto } from './vocabulary-word-meaning.dto';

export class VocabularyWordItemDto {
  @ApiProperty({ description: 'الكلمة الألمانية' })
  @IsNotEmpty()
  @IsString()
  word: string;

  @ApiProperty({ 
    required: false, 
    description: 'المعنى كـ string مفصولة بـ / (للتوافق مع البيانات القديمة)' 
  })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => !o.meanings || (Array.isArray(o.meanings) && o.meanings.length === 0))
  @IsNotEmpty({ message: 'Either meaning or meanings must be provided' })
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
  @ValidateIf((o) => !o.meaning || o.meaning.trim() === '')
  meanings?: VocabularyWordMeaningDto[];

  @ApiProperty({ required: false, description: 'مثال على استخدام الكلمة' })
  @IsOptional()
  @IsString()
  exampleSentence?: string;

  @ApiProperty({ required: false, description: 'ترتيب الكلمة في الموضوع (0, 1, 2, ...)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;
}

export class CreateBulkVocabularyWordsDto {
  @ApiProperty({ description: 'معرف الموضوع' })
  @IsNotEmpty()
  @IsMongoId()
  topicId: string;

  @ApiProperty({ type: [VocabularyWordItemDto], description: 'مصفوفة الكلمات' })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VocabularyWordItemDto)
  words: VocabularyWordItemDto[];
}




















