import { Type } from 'class-transformer';
import {
  IsString,
  IsArray,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsNumber,
  Min,
  ValidateNested,
  ArrayMinSize,
  IsNotEmpty,
} from 'class-validator';

class QuestionOptionDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsOptional()
  isCorrect?: boolean;
}

export class CreateQuestionWithExamDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options: QuestionOptionDto[];

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsEnum(['easy', 'medium', 'hard'])
  difficulty?: 'easy' | 'medium' | 'hard';

  @IsEnum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

  @IsEnum(['draft', 'published'])
  status: 'draft' | 'published';

  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @IsMongoId()
  examId: string;

  @IsString()
  @IsNotEmpty()
  sectionTitle: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  points?: number;
}

