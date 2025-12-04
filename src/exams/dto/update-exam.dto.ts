import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { CreateExamDto, ExamTypeEnum } from './create-exam.dto';
import { IsEnum, IsMongoId, IsOptional, IsArray, IsString } from 'class-validator';
import type { ExamStatus } from '../schemas/exam.schema';
import { ExamStatusEnum } from '../schemas/exam.schema';
import { ProviderEnum } from '../../common/enums/provider.enum';

export class UpdateExamDto extends PartialType(CreateExamDto) {
  // Override sections to ensure null values are filtered
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    // Filter out null, undefined, and empty objects from sections array
    if (Array.isArray(value)) {
      return value.filter((s) => {
        // Remove null or undefined
        if (s === null || s === undefined) {
          return false;
        }
        // Remove empty objects {} (objects with no keys or only undefined/null values)
        if (typeof s === 'object' && !Array.isArray(s)) {
          const keys = Object.keys(s);
          // If object has no keys, it's empty {}
          if (keys.length === 0) {
            return false;
          }
          // Check if object has any meaningful values (not all undefined/null)
          const hasValidValue = keys.some((key) => {
            const value = s[key];
            return value !== null && value !== undefined && value !== '';
          });
          return hasValidValue;
        }
        return true;
      });
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
  @IsEnum(ProviderEnum)
  provider?: ProviderEnum;

  @IsOptional()
  @IsEnum(ExamTypeEnum)
  examType?: ExamTypeEnum; // للتوافق مع الفرونت (leben_test)
}

