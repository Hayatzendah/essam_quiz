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
  MinLength,
  ValidateIf,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { QuestionType } from '../schemas/question.schema';
import { ProviderEnum } from '../../common/enums/provider.enum';
import { normalizeProvider } from '../../common/utils/provider-normalizer.util';

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

// DTO للفراغات التفاعلية
class InteractiveBlankDto {
  @IsString()
  @MinLength(1)
  id: string; // a, b, c, ... حتى 10

  @IsEnum(['dropdown', 'textInput'])
  type: 'dropdown' | 'textInput';

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  correctAnswers: string[];

  @ValidateIf((o) => o.type === 'dropdown')
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  choices?: string[];

  @IsOptional()
  @IsString()
  hint?: string;
}

// DTO لأجزاء الترتيب
class ReorderPartDto {
  @IsString()
  @MinLength(1)
  id: string;

  @IsString()
  @MinLength(1)
  text: string;

  @IsNumber()
  @Min(1)
  order: number;
}

class InteractiveReorderDto {
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => ReorderPartDto)
  parts: ReorderPartDto[];
}

export class CreateQuestionWithExamDto {
  // ====== البيانات الأساسية للسؤال ======
  // type كـ alias لـ qType (للتوافق مع الفرونت)
  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  text?: string;      // النص الأساسي للسؤال (optional للـ interactive_text reorder، required للباقي)

  @IsOptional()
  @IsString()
  prompt?: string;   // لو حابة تستخدمه لاحقًا

  @IsEnum(QuestionType)
  @Transform(({ obj }) => obj.qType || obj.type)
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
  fillExact?: string | string[]; // الإجابة لحقل أكمل الفراغ (يمكن أن يكون string أو array)

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regexList?: string[];

  // ====== MATCH ======
  @ValidateIf((o) => o.qType === QuestionType.MATCH)
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  answerKeyMatch?: [string, string][]; // أزواج [left, right]

  // ====== REORDER ======
  @ValidateIf((o) => o.qType === QuestionType.REORDER)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  answerKeyReorder?: string[]; // ترتيب صحيح

  @IsInt()
  @Min(0)
  points: number;

  @IsString()
  @IsNotEmpty()
  level: string;

  @IsEnum(QuestionUsageCategoryEnum)
  usageCategory: QuestionUsageCategoryEnum; // "provider"

  // ====== ربطه بالامتحان الرسمي ======
  @Transform(({ value }) => normalizeProvider(value))
  @IsEnum(ProviderEnum)
  @IsNotEmpty()
  provider: ProviderEnum;          // "Goethe" / "GOETHE" / "goethe" (case-insensitive)

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

  // ====== ربط بموضوع القواعد (للامتحانات النحوية) ======
  @IsOptional()
  @IsMongoId()
  grammarTopicId?: string;

  @IsOptional()
  @IsString()
  grammarLevel?: string; // A1, A2, B1, B2, C1

  @IsOptional()
  @IsString()
  grammarTopic?: string; // slug الموضوع (مثل: "dativ")

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

  // ====== INTERACTIVE_TEXT (أسئلة النص التفاعلي) ======
  // ملاحظة: text موجود أصلاً في السطر 115، نستخدمه للـ interactive_text أيضاً

  @ValidateIf((o) => o.qType === QuestionType.INTERACTIVE_TEXT)
  @IsOptional()
  @IsArray()
  @ArrayMinSize(3)
  @ValidateNested({ each: true })
  @Type(() => InteractiveBlankDto)
  interactiveBlanks?: InteractiveBlankDto[]; // للفراغات المتعددة

  @ValidateIf((o) => o.qType === QuestionType.INTERACTIVE_TEXT)
  @IsOptional()
  @ValidateNested()
  @Type(() => InteractiveReorderDto)
  interactiveReorder?: InteractiveReorderDto; // لترتيب الأجزاء
}
