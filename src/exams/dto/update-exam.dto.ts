import { PartialType } from '@nestjs/mapped-types';
import { CreateExamDto } from './create-exam.dto';
import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { ExamStatus } from '../schemas/exam.schema';

export class UpdateExamDto extends PartialType(CreateExamDto) {
  // السماح بتغيير الحالة مع تحقق بالـ Service
  @IsOptional() @IsEnum(ExamStatus)
  status?: ExamStatus;

  // الإسناد (اختياري عبر PATCH أيضاً)
  @IsOptional() @IsMongoId()
  assignedClassId?: string;
}

