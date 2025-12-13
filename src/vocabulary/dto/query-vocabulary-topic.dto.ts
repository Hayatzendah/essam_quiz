import { IsEnum, IsOptional, IsString } from 'class-validator';
import type { VocabularyLevel } from '../schemas/vocabulary-topic.schema';

export class QueryVocabularyTopicDto {
  @IsOptional()
  @IsEnum(['A1', 'A2', 'B1', 'B2', 'C1'])
  level?: VocabularyLevel;

  @IsOptional()
  @IsString()
  isActive?: string; // 'true' or 'false' as query param
}

