import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ExamStatus } from '../schemas/exam.schema';

export class QueryExamDto {
  @IsOptional() @IsEnum(ExamStatus)
  status?: ExamStatus;

  @IsOptional() @IsString()
  level?: string;
}

