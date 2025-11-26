import { PartialType } from '@nestjs/mapped-types';
import { CreateExamDto } from './create-exam.dto';
import { IsEnum, IsMongoId, IsOptional, IsArray, IsString } from 'class-validator';
import type { ExamStatus } from '../schemas/exam.schema';
import { ExamStatusEnum } from '../schemas/exam.schema';

export class UpdateExamDto extends PartialType(CreateExamDto) {
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

