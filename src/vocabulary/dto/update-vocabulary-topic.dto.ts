import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import type { VocabularyLevel } from '../schemas/vocabulary-topic.schema';

export class UpdateVocabularyTopicDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(['A1', 'A2', 'B1', 'B2', 'C1'])
  level?: VocabularyLevel;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

