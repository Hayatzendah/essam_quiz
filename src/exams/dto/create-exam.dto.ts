import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProviderEnum } from '../../common/enums/provider.enum';
import { ExamCategoryEnum, ExamSkillEnum, ExamStatusEnum } from '../../common/enums';
import type { ExamStatus } from '../../common/enums';

/**
 * أنواع الامتحانات (اختياري - للتوافق مع الفرونت)
 */
export enum ExamTypeEnum {
  GRAMMAR = 'grammar_exam',
  PROVIDER = 'provider_exam',
  LEBEN_TEST = 'leben_test',
}

/**
 * توزيع الصعوبة (اختياري داخل السكشن)
 */
export class DifficultyDistributionDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  easy?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  medium?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  hard?: number;
}

/**
 * عنصر سؤال داخل سكشن (يُستخدم في القواعد لو عندك items ثابتة)
 */
export class SectionItemDto {
  @IsMongoId()
  @IsNotEmpty()
  questionId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  points?: number;
}

/**
 * سكشن امتحان – يدعم:
 *  - نظام القواعد (items ثابتة) - يستخدم name + items
 *  - نظام Prüfungen (quota + skill + teilNumber)
 *  - Leben in Deutschland (title + quota + teil)
 */
export class ExamSectionDto {
  // title مطلوب إذا لم يكن هناك items (للشكل الجديد)
  @ValidateIf((o) => !o.items || o.items.length === 0)
  @IsString()
  @IsNotEmpty()
  title?: string;            // "Leben in Deutschland – Teil 1" - مطلوب إذا لم يكن items

  @IsOptional()
  @IsString()
  name?: string;             // "Hören – Teil 1" - للتوافق مع الكود القديم (مع items)

  @IsOptional()
  @IsString()
  description?: string;      // وصف السكشن أو نص القراءة (اختياري)

  @IsOptional()
  @IsString()
  section?: string;          // نص إضافي لو حابة (عندك نفس القيمة)

  @IsOptional()
  @IsEnum(ExamSkillEnum)
  skill?: ExamSkillEnum;     // HOEREN / LESEN / ...

  // teil مطلوب إذا لم يكن هناك items (يدعم teil أو teilNumber)
  @ValidateIf((o) => !o.items || o.items.length === 0)
  @IsInt()
  @Min(1)
  teil?: number;             // 1, 2, 3... - مطلوب إذا لم يكن items

  @IsOptional()
  @IsInt()
  @Min(1)
  teilNumber?: number;       // 1, 2, 3... - للتوافق مع الكود القديم

  // quota مطلوب إذا لم يكن هناك items
  @ValidateIf((o) => !o.items || o.items.length === 0)
  @IsInt()
  @Min(0)
  quota?: number;            // عدد الأسئلة العشوائي - مطلوب إذا لم يكن items

  @IsOptional()
  @ValidateNested()
  @Type(() => DifficultyDistributionDto)
  difficultyDistribution?: DifficultyDistributionDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  // فقط لامتحانات القواعد لو عندك سكشن بأسئلة ثابتة
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SectionItemDto)
  items?: SectionItemDto[];

  // حقول إضافية للتوافق مع الكود القديم
  @IsOptional()
  @IsMongoId()
  topicId?: string;          // للتوافق مع الكود القديم (اختياري)
}

/**
 * إنشاء امتحان جديد
 */
export class CreateExamDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  level: string;             // A1 / A2 / ...

  @IsInt()
  @Min(1)
  timeLimitMin: number;

  @IsEnum(ExamStatusEnum)
  status: ExamStatus;

  @IsEnum(ExamCategoryEnum)
  examCategory: ExamCategoryEnum;

  @IsOptional()
  @IsEnum(ExamTypeEnum)
  examType?: ExamTypeEnum; // للتوافق مع الفرونت (leben_test)

  @IsOptional()
  @IsBoolean()
  randomizeQuestions?: boolean;

  // ========= حقول خاصة بالقواعد =========

  @ValidateIf(o => o.examCategory === ExamCategoryEnum.GRAMMAR)
  @IsMongoId()
  grammarTopicId?: string;

  // ========= حقول خاصة بـ Prüfungen =========

  @ValidateIf(o => o.examCategory === ExamCategoryEnum.PROVIDER)
  @IsEnum(ProviderEnum)
  @IsNotEmpty()
  provider?: ProviderEnum;         // "goethe" / "telc" ...

  @ValidateIf(o => o.examCategory === ExamCategoryEnum.PROVIDER)
  @IsEnum(ExamSkillEnum)
  @IsNotEmpty()
  mainSkill?: ExamSkillEnum;       // "hoeren" / "lesen" / "leben_test" ...

  // ========= مشتركة =========

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamSectionDto)
  sections: ExamSectionDto[];
}

// DTO للـ practice exam - يجعل title اختياري
export class CreatePracticeExamDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() level?: string;
  @IsOptional() @IsEnum(ProviderEnum) provider?: ProviderEnum;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamSectionDto)
  sections: ExamSectionDto[];

  @IsOptional()
  @IsBoolean()
  randomizeQuestions?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  attemptLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  timeLimitMin?: number;

  @IsOptional()
  @IsString()
  resultsPolicy?:
    | 'only_scores'
    | 'correct_with_scores'
    | 'explanations_with_scores'
    | 'release_delayed';
}
