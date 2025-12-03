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

/**
 * أنواع الامتحانات
 */
export enum ExamCategoryEnum {
  GRAMMAR = 'grammar_exam',
  LID = 'lid_exam',
  PROVIDER = 'provider_exam',
}

/**
 * مهارات الامتحانات الرسمية
 */
export enum ExamSkillEnum {
  HOEREN = 'HOEREN',
  LESEN = 'LESEN',
  SCHREIBEN = 'SCHREIBEN',
  SPRECHEN = 'SPRECHEN',
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
 *  - نظام القواعد (items ثابتة)
 *  - نظام Prüfungen (quota + skill + teilNumber)
 */
export class ExamSectionDto {
  // يدعم title أو name - أحدهما مطلوب
  @IsOptional()
  @IsString()
  title?: string;            // "Hören – Teil 1" - للفرونت الجديد

  @IsOptional()
  @IsString()
  name?: string;             // "Hören – Teil 1" - للتوافق مع الكود القديم

  @IsOptional()
  @IsString()
  description?: string;      // وصف السكشن أو نص القراءة (اختياري)

  @IsOptional()
  @IsString()
  section?: string;          // نص إضافي لو حابة (عندك نفس القيمة)

  @IsOptional()
  @IsEnum(ExamSkillEnum)
  skill?: ExamSkillEnum;     // HOEREN / LESEN / ...

  @IsOptional()
  @IsInt()
  @Min(1)
  teilNumber?: number;       // 1, 2, 3...

  @IsOptional()
  @IsInt()
  @Min(0)
  quota?: number;            // عدد الأسئلة العشوائي

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

  @IsString()
  @IsNotEmpty()
  status: string;            // draft / published

  @IsEnum(ExamCategoryEnum)
  examCategory: ExamCategoryEnum;

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
  provider?: ProviderEnum;         // "Goethe" / "telc" ...

  @ValidateIf(o => o.examCategory === ExamCategoryEnum.PROVIDER)
  @IsString()
  @IsNotEmpty()
  mainSkill?: string;        // "hoeren" / "lesen" ... (زي اللي جاي من الفرونت)

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
