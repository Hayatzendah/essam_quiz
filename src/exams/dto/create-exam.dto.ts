import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import type { ExamStatus } from '../schemas/exam.schema';
import { ExamStatusEnum } from '../schemas/exam.schema';
import { ExamCategoryEnum, ExamSkillEnum } from '../../common/enums';

class SectionItemDto {
  @IsMongoId() questionId: string;
  @IsOptional() @IsInt() @Min(0) points?: number;
}

class DifficultyDistributionDto {
  @IsOptional() @IsInt() @Min(0) easy?: number;
  @IsOptional() @IsInt() @Min(0) medium?: number;
  @IsOptional() @IsInt() @Min(0) hard?: number;
}

class ExamSectionDto {
  // يطابق name اللي جاي من الفرونت
  @IsString()
  @IsNotEmpty()
  name: string; // "Hören – Teil 1"

  // حقل section اللي إنتِ تبعتيه: "Hören – Teil 1"
  @IsOptional()
  @IsString()
  section?: string;

  // المهارة (hoeren / lesen / ...)
  @IsOptional()
  @IsEnum(ExamSkillEnum)
  skill?: ExamSkillEnum;

  // Teil 1 / 2 / 3 ...
  @IsOptional()
  @IsInt()
  @Min(1)
  teilNumber?: number;

  // عدد الأسئلة العشوائية لهذا القسم
  @IsOptional()
  @IsInt()
  @Min(1)
  quota?: number;

  // توزيع الصعوبة (اختياري)
  @IsOptional()
  @ValidateNested()
  @Type(() => DifficultyDistributionDto)
  difficultyDistribution?: DifficultyDistributionDto;

  // Tags للقسم نفسه (اختياري)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  // للسِناريو القديم (القواعد): قائمة أسئلة ثابتة
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SectionItemDto)
  items?: SectionItemDto[];

  // Optional fields for backward compatibility
  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  timeLimitMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  durationMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  partsCount?: number;

  @IsOptional()
  @IsBoolean()
  randomize?: boolean;
}

export class CreateExamDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  timeLimitMin?: number;

  @IsOptional()
  @IsEnum(ExamStatusEnum)
  status?: ExamStatus;

  @IsEnum(ExamCategoryEnum)
  examCategory: ExamCategoryEnum;

  @IsOptional()
  @IsBoolean()
  randomizeQuestions?: boolean;

  // ====== الحقول الخاصة بالقواعد فقط ======
  @ValidateIf((o) => o.examCategory === ExamCategoryEnum.GRAMMAR)
  @IsMongoId()
  grammarTopicId?: string;

  // ====== الحقول الخاصة بـ Prüfungen (provider_exam) ======
  @ValidateIf((o) => o.examCategory === ExamCategoryEnum.PROVIDER)
  @IsString()
  @IsNotEmpty()
  provider?: string; // "goethe" / "telc" ...

  @ValidateIf((o) => o.examCategory === ExamCategoryEnum.PROVIDER)
  @IsString()
  @IsNotEmpty()
  mainSkill?: string; // "hoeren" / "lesen" ... (حسب ما اتفقتوا)

  // الوسوم العامة للامتحان
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  // الأقسام – تنطبق على كل الأنواع، بس تحققهم يكون موحّد
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ExamSectionDto)
  sections: ExamSectionDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  attemptLimit?: number;

  @IsOptional()
  @IsString()
  resultsPolicy?:
    | 'only_scores'
    | 'correct_with_scores'
    | 'explanations_with_scores'
    | 'release_delayed';
}

// DTO للـ practice exam - يجعل title اختياري
export class CreatePracticeExamDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() level?: string;
  @IsOptional() @IsString() provider?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ExamSectionDto)
  sections: ExamSectionDto[];

  @IsOptional()
  @IsBoolean()
  randomizeQuestions?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  attemptLimit?: number;

  @IsOptional()
  @IsNumber()
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
