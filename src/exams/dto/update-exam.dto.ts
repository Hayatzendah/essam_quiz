import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { CreateExamDto } from './create-exam.dto';
import { IsEnum, IsMongoId, IsOptional, IsArray, IsString } from 'class-validator';
import type { ExamStatus } from '../schemas/exam.schema';
import { ExamStatusEnum } from '../schemas/exam.schema';

export class UpdateExamDto extends PartialType(CreateExamDto) {
  // Override sections to ensure null values are filtered
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    // Filter out null/undefined values from sections array
    if (Array.isArray(value)) {
      return value.filter((s) => s !== null && s !== undefined);
    }
    return value;
  })
  sections?: any[];
  // السماح بتغيير الحالة مع تحقق بالـ Service
  @IsOptional()
  @IsEnum(ExamStatusEnum)
  status?: ExamStatus;

  // الإسناد (اختياري عبر PATCH أيضاً)
  @IsOptional()
  @IsMongoId()
  classId?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  studentIds?: string[];

  // الحقول الإضافية
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  provider?: string;
}

