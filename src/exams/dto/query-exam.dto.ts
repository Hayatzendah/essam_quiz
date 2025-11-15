import { IsEnum, IsOptional, IsString } from 'class-validator';
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
}



