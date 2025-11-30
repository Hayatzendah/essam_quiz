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
import { QuestionType } from '../schemas/question.schema';

export enum QuestionUsageCategoryEnum {
  GRAMMAR = 'grammar',
  PROVIDER = 'provider',
}

class QuestionOptionDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsBoolean()
  isCorrect: boolean;
}

export class CreateQuestionWithExamDto {
  // ====== البيانات الأساسية للسؤال ======
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsEnum(QuestionType)
  qType: QuestionType;

  @ValidateIf((o) => o.qType === QuestionType.MCQ)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];

  @IsInt()
  @Min(0)
  points: number;

  @IsString()
  @IsNotEmpty()
  level: string;

  @IsEnum(QuestionUsageCategoryEnum)
  usageCategory: QuestionUsageCategoryEnum; // "provider"

  // ====== ربطه بالامتحان الرسمي ======
  @IsString()
  @IsNotEmpty()
  provider: string;          // "Goethe"

  @IsString()
  @IsNotEmpty()
  skill: string;             // "hoeren" / "HOEREN"

  @IsInt()
  @Min(1)
  teilNumber: number;        // 1

  @IsOptional()
  @IsString()
  section?: string;          // "Hoeren" أو "Hören – Teil 1"

  @IsMongoId()
  @IsNotEmpty()
  examId: string;

  // ====== حالة السؤال ======
  @IsString()
  @IsNotEmpty()
  status: string;            // "published" / "draft"

  // ====== وسوم اختيارية ======
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  // ====== نص سؤال مفتوح (فقط لو النوع FILL أو TEXT) ======
  @ValidateIf((o) => o.qType === QuestionType.FILL || o.qType === 'text')
  @IsString()
  @IsNotEmpty()
  text?: string;

  // ====== حقول اختيارية إضافية ======
  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsEnum(['easy', 'medium', 'hard'])
  difficulty?: 'easy' | 'medium' | 'hard';

  // ====== للحفاظ على التوافق مع الكود القديم ======
  @IsOptional()
  @IsString()
  sectionTitle?: string;     // للحفاظ على التوافق

  // ====== رابط ملف الصوت (لأسئلة الاستماع) ======
  @IsOptional()
  @IsString()
  audioUrl?: string;
}
