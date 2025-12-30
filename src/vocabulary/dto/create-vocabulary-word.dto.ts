import { IsMongoId, IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreateVocabularyWordDto {
  @IsNotEmpty()
  @IsMongoId()
  topicId: string;

  @IsNotEmpty()
  @IsString()
  word: string;

  @IsNotEmpty()
  @IsString()
  meaning: string;

  @IsOptional()
  @IsString()
  exampleSentence?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
















