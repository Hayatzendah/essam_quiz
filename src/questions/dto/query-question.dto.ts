import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { QuestionStatus, QuestionType } from '../schemas/question.schema';

export class QueryQuestionDto {
  @IsOptional() @IsString() provider?: string;
  @IsOptional() @IsString() level?: string;
  @IsOptional() @IsString() section?: string;
  @IsOptional() @IsString() difficulty?: string; // 'easy' | 'medium' | 'hard'
  @IsOptional() @IsEnum(QuestionType) qType?: QuestionType;
  @IsOptional() @IsEnum(QuestionStatus) status?: QuestionStatus;
  @IsOptional() @IsString() tags?: string; // comma-separated
  @IsOptional() @IsString() text?: string; // بحث نصي عام على prompt

  @IsOptional() @IsNumberString() page?: string; // 1..n
  @IsOptional() @IsNumberString() limit?: string; // 10..n
}

