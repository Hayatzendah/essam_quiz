import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class QueryVocabularyWordDto {
  @IsOptional()
  @IsMongoId()
  topicId?: string;

  @IsOptional()
  @IsString()
  isActive?: string; // 'true' or 'false' as query param
}





