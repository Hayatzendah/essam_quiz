import { IsOptional, IsString } from 'class-validator';

export class QueryVocabularyTopicDto {
  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  isActive?: string; // 'true' or 'false' as query param
}
