import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import { 
  CreateExamDto, 
  ExamTypeEnum, 
  ExamSectionDto,
  DifficultyDistributionDto,
  SectionItemDto
} from './create-exam.dto';
import { 
  IsEnum, 
  IsMongoId, 
  IsOptional, 
  IsArray, 
  IsString, 
  IsInt, 
  IsBoolean,
  IsNotEmpty,
  Min,
  ValidateNested,
  ValidateIf
} from 'class-validator';
import { ExamStatusEnum, ExamCategoryEnum, ExamSkillEnum } from '../../common/enums';
import { ProviderEnum } from '../../common/enums/provider.enum';
import { normalizeProvider } from '../../common/utils/provider-normalizer.util';

export class UpdateExamDto extends PartialType(CreateExamDto) {
  // Override sections to ensure null values are filtered and proper validation
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamSectionDto)
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
  sections?: ExamSectionDto[];

  // السماح بتغيير الحالة مع تحقق بالـ Service
  @IsOptional()
  @IsEnum(ExamStatusEnum)
  status?: ExamStatusEnum;

  // الإسناد (اختياري عبر PATCH أيضاً)
  @IsOptional()
  @IsMongoId()
  classId?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  studentIds?: string[];

  // الحقول الأساسية (اختيارية في التعديل)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  level?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimitMin?: number;

  @IsOptional()
  @IsEnum(ExamCategoryEnum)
  examCategory?: ExamCategoryEnum;

  @IsOptional()
  @IsEnum(ExamTypeEnum)
  examType?: ExamTypeEnum;

  @IsOptional()
  @IsBoolean()
  randomizeQuestions?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  attemptsLimit?: number; // 0 = غير محدود (اسم الحقل: attemptsLimit)
  
  // للتوافق مع الكود القديم
  @IsOptional()
  @IsInt()
  @Min(0)
  attemptLimit?: number; // 0 = غير محدود (deprecated - استخدم attemptsLimit)

  // حقول خاصة بالقواعد
  @IsOptional()
  @ValidateIf(o => o.examCategory === ExamCategoryEnum.GRAMMAR)
  @IsMongoId()
  grammarTopicId?: string;

  // حقول خاصة بـ Prüfungen
  @IsOptional()
  @ValidateIf(o => o.examCategory === ExamCategoryEnum.PROVIDER)
  @Transform(({ value }) => normalizeProvider(value))
  @IsEnum(ProviderEnum)
  @IsNotEmpty()
  provider?: ProviderEnum;

  @IsOptional()
  @ValidateIf(o => o.examCategory === ExamCategoryEnum.PROVIDER)
  @IsEnum(ExamSkillEnum)
  @IsNotEmpty()
  mainSkill?: ExamSkillEnum;

  // حقول مشتركة
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

