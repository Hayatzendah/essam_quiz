import { IsArray, IsBoolean, IsEnum, IsIn, IsOptional, IsString, MinLength, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionStatus, QuestionType } from '../schemas/question.schema';

class McqOptionDto {
  @IsString()
  @MinLength(1)
  text: string;

  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;
}

export class CreateQuestionDto {
  @IsString() @MinLength(3)
  prompt: string;

  @IsEnum(QuestionType)
  qType: QuestionType;

  // MCQ
  @IsOptional() @IsArray() @ArrayMinSize(2) @ValidateNested({ each: true })
  @Type(() => McqOptionDto)
  options?: McqOptionDto[];

  // TRUE/FALSE
  @IsOptional() @IsBoolean()
  answerKeyBoolean?: boolean;

  // FILL
  @IsOptional() @IsString()
  fillExact?: string;

  @IsOptional() @IsArray()
  @IsString({ each: true })
  regexList?: string[];

  // فلاتر
  @IsOptional() @IsString() provider?: string;
  @IsOptional() @IsString() section?: string;
  @IsOptional() @IsString() level?: string;
  @IsOptional() @IsIn(['easy', 'medium', 'hard']) difficulty?: 'easy' | 'medium' | 'hard';
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];

  // حالة ابتدائية اختيارية
  @IsOptional() @IsEnum(QuestionStatus)
  status?: QuestionStatus;
}

