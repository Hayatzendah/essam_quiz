import { IsMongoId, IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateVocabularyWordDto {
  @IsOptional()
  @IsMongoId()
  topicId?: string;

  @IsOptional()
  @IsString()
  word?: string;

  @IsOptional()
  @IsString()
  meaning?: string;

  @IsOptional()
  @IsString()
  exampleSentence?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}















