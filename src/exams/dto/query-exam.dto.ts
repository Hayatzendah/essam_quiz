import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ExamStatus } from '../schemas/exam.schema';

export class QueryExamDto {
  @IsOptional() @IsEnum(ExamStatus)
  status?: ExamStatus;

  @IsOptional() @IsString()
  level?: string;

  @IsOptional() @IsString()
  provider?: string;

  @IsOptional() @IsString()
  state?: string; // الولاية الألمانية (Bundesland) - للفلترة حسب tags في sections

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  limit?: number;
}



