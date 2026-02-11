import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ExamSkillEnum } from '../../common/enums';
import { normalizeSkill } from '../../common/utils/skill-normalizer.util';

export class AddSectionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  key?: string; // auto-generated if omitted

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeSkill(value))
  @IsEnum(ExamSkillEnum)
  skill?: ExamSkillEnum;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  teilNumber?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  timeLimitMin?: number;

  // الصوت يُرفع مع السؤال (listeningClipId) وليس مع القسم
  // الأسئلة تُضاف يدوياً عبر POST /exams/:examId/sections/:key/questions

  @IsOptional()
  @IsBoolean()
  randomize?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;
}
