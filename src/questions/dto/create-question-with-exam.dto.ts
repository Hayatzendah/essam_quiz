import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType } from '../schemas/question.schema';
import { ProviderEnum } from '../../common/enums/provider.enum';

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

class QuestionMediaDto {
  @IsEnum(['audio', 'image', 'video'])
  type: 'audio' | 'image' | 'video';

  @IsString()
  @IsNotEmpty()
  key: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsString()
  @IsNotEmpty()
  mime: string;

  @IsOptional()
  @IsIn(['s3', 'cloudinary'])
  provider?: 's3' | 'cloudinary';
}

export class CreateQuestionWithExamDto {
  // ====== البيانات الأساسية للسؤال ======
  @IsEnum(QuestionType)
  type: QuestionType;

  @IsString()
  @IsNotEmpty()
  text: string;      // النص الأساسي للسؤال

  @IsOptional()
  @IsString()
  prompt?: string;   // لو حابة تستخدمه لاحقًا

  @IsEnum(QuestionType)
  qType: QuestionType;

  @ValidateIf((o) => o.qType === QuestionType.MCQ)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];

  // ====== TRUE/FALSE ======
  @ValidateIf((o) => o.qType === QuestionType.TRUE_FALSE)
  @IsBoolean({ message: 'answerKeyBoolean must be a boolean when qType is true_false' })
  answerKeyBoolean?: boolean;

  // ====== FILL ======
  @IsOptional()
  @IsString()
  fillExact?: string; // الإجابة لحقل أكمل الفراغ

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regexList?: string[];

  @IsInt()
  @Min(0)
  points: number;

  @IsString()
  @IsNotEmpty()
  level: string;

  @IsEnum(QuestionUsageCategoryEnum)
  usageCategory: QuestionUsageCategoryEnum; // "provider"

  // ====== ربطه بالامتحان الرسمي ======
  @IsEnum(ProviderEnum)
  @IsNotEmpty()
  provider: ProviderEnum;          // "Goethe"

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
  // تم نقل text إلى الأعلى كحقل أساسي

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

  // ====== رابط ملف الصوت (لأسئلة الاستماع) - للتوافق مع الكود القديم ======
  @IsOptional()
  @IsString()
  audioUrl?: string;

  // ====== ربط بكليب الاستماع (لأسئلة Hören) ======
  @IsOptional()
  @IsMongoId()
  listeningClipId?: string;

  // ====== وسائط (صوت، صورة، فيديو) ======
  @IsOptional()
  @ValidateNested()
  @Type(() => QuestionMediaDto)
  media?: QuestionMediaDto;

  // ====== FREE_TEXT (أسئلة الكتابة) ======
  @ValidateIf((o) => o.qType === QuestionType.FREE_TEXT)
  @IsOptional()
  @IsString()
  sampleAnswer?: string; // نموذج إجابة (للمعلم فقط)

  @ValidateIf((o) => o.qType === QuestionType.FREE_TEXT)
  @IsOptional()
  @IsNumber()
  @Min(0)
  minWords?: number; // حد أدنى للكلمات

  @ValidateIf((o) => o.qType === QuestionType.FREE_TEXT)
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxWords?: number; // حد أقصى للكلمات

  // ====== SPEAKING (أسئلة التحدث) ======
  @ValidateIf((o) => o.qType === QuestionType.SPEAKING)
  @IsOptional()
  @IsString()
  modelAnswerText?: string; // نموذج إجابة (للمعلم فقط)

  @ValidateIf((o) => o.qType === QuestionType.SPEAKING)
  @IsOptional()
  @IsNumber()
  @Min(0)
  minSeconds?: number; // حد أدنى للثواني

  @ValidateIf((o) => o.qType === QuestionType.SPEAKING)
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxSeconds?: number; // حد أقصى للثواني
}
