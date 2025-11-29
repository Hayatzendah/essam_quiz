import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import type { ExamStatus } from '../schemas/exam.schema';
import { ExamStatusEnum } from '../schemas/exam.schema';
import { ExamCategoryEnum, ExamSkillEnum } from '../../common/enums';

class SectionItemDto {
  @IsMongoId() questionId: string;
  @IsOptional() @IsNumber() @Min(0) points?: number;
}

class DifficultyDistributionDto {
  @IsOptional() @IsNumber() @Min(0) easy?: number;
  @IsOptional() @IsNumber() @Min(0) medium?: number;
  @IsOptional() @IsNumber() @Min(0) hard?: number;
}

class ExamSectionDto {
  @IsString()
  @IsNotEmpty()
  name: string; // يطابق name اللي جاية من الفرونت

  // للحقول الجديدة لدعم Prüfungen
  @IsOptional()
  @IsString()
  key?: string; // مثال: 'hoeren_teil1'

  // للحفاظ على التوافق مع الكود القديم
  @IsOptional()
  @IsString()
  title?: string; // للتوافق مع الكود القديم

  // لو حابة تحتفظي بـ "section" كاسم تاني ممكن تخليه اختياري
  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @IsEnum(ExamSkillEnum)
  skill?: ExamSkillEnum; // 'hoeren' | 'lesen' | 'schreiben' | 'sprechen'

  @IsOptional()
  @IsNumber()
  @Min(1)
  teilNumber?: number; // 1 أو 2 أو 3...

  @IsOptional()
  @IsNumber()
  @Min(0)
  timeLimitMin?: number; // وقت هذا القسم (اختياري)

  // للـ Provider exams: استخدام quota
  @IsOptional()
  @IsNumber()
  @Min(1)
  quota?: number;

  // للـ Grammar exams: استخدام items (اختياري بدون إجبار)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionItemDto)
  items?: SectionItemDto[]; // بدون @ArrayMinSize(1) عشان ما يجبرك تبعتي items

  // Optional fields for backward compatibility
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  durationMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  partsCount?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => DifficultyDistributionDto)
  difficultyDistribution?: DifficultyDistributionDto;

  @IsOptional()
  @IsBoolean()
  randomize?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class CreateExamDto {
  @IsString() @IsNotEmpty() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() level?: string;
  @IsOptional() @IsString() provider?: string;
  
  @IsEnum(ExamCategoryEnum)
  examCategory: ExamCategoryEnum;

  @IsOptional()
  @IsEnum(ExamSkillEnum)
  mainSkill?: ExamSkillEnum; // 'mixed' | 'hoeren' | 'lesen' | 'schreiben' | 'sprechen'

  // للحقول الخاصة بالقواعد (optional)
  @IsOptional()
  @IsMongoId()
  grammarTopicId?: string;

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

  // اختياري: في حال أردت بدءًا بحالة غير الـ draft
  @IsOptional()
  @IsEnum(ExamStatusEnum)
  status?: ExamStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
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
