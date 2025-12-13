import { IsEnum, IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';
import type { VocabularyLevel } from '../schemas/vocabulary-topic.schema';

export class CreateVocabularyTopicDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsEnum(['A1', 'A2', 'B1', 'B2', 'C1'])
  level: VocabularyLevel;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

