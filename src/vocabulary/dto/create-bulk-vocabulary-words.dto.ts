import { IsMongoId, IsNotEmpty, IsArray, IsString, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class VocabularyWordItemDto {
  @IsNotEmpty()
  @IsString()
  word: string;

  @IsNotEmpty()
  @IsString()
  meaning: string;

  @IsOptional()
  @IsString()
  exampleSentence?: string;
}

export class CreateBulkVocabularyWordsDto {
  @IsNotEmpty()
  @IsMongoId()
  topicId: string;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VocabularyWordItemDto)
  words: VocabularyWordItemDto[];
}













