import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ExamStatusEnum } from '../../common/enums';
import { ExamCategoryEnum, ExamSkillEnum } from '../../common/enums';

export class QueryExamDto {
  @IsOptional()
  @IsEnum(ExamStatusEnum)
  status?: ExamStatusEnum;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsEnum(ExamCategoryEnum)
  examCategory?: ExamCategoryEnum;

  @IsOptional()
  @IsEnum(ExamSkillEnum)
  mainSkill?: ExamSkillEnum;

  @IsOptional()
  @IsString()
  state?: string; // الولاية الألمانية (Bundesland) - للفلترة حسب tags في sections

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
