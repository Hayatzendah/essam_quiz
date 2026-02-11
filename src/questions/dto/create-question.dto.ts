import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsMongoId,
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
import { QuestionStatus, QuestionType } from '../schemas/question.schema';
import { ProviderEnum } from '../../common/enums/provider.enum';
import { ExamSkillEnum } from '../../common/enums';
import { normalizeProvider } from '../../common/utils/provider-normalizer.util';
import { normalizeSkill } from '../../common/utils/skill-normalizer.util';

class McqOptionDto {
  @IsString()
  @MinLength(1)
  text: string;

  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;
}

class QuestionMediaDto {
  @IsEnum(['audio', 'image', 'video'])
  type: 'audio' | 'image' | 'video';

  @IsString()
  key: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  mime?: string;

  @IsOptional()
  @IsIn(['s3', 'cloudinary'])
  provider?: 's3' | 'cloudinary';

  @IsOptional()
  @IsString()
  description?: string; // وصف الصورة (يظهر تحت الصورة في الفرونت)
}

// DTO للفراغات التفاعلية
class InteractiveBlankDto {
  @IsString()
  @MinLength(1)
  id: string; // a, b, c, ... حتى 10

  @IsEnum(['dropdown', 'select', 'textInput'])
  type: 'dropdown' | 'select' | 'textInput';

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  correctAnswers: string[];

  @ValidateIf((o) => o.type === 'dropdown' || o.type === 'select')
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  options?: string[]; // الشكل الجديد - مطلوب إذا type = 'dropdown' أو 'select' (حتى 12)

  @ValidateIf((o) => (o.type === 'dropdown' || o.type === 'select') && !o.options)
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  choices?: string[]; // للتوافق مع الكود القديم (حتى 12)

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

export class CreateQuestionDto {
  @IsString()
  @MinLength(1)
  prompt: string;

  // type كـ alias لـ qType (للتوافق مع الفرونت)
  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  @IsEnum(QuestionType)
  @Transform(({ obj }) => obj.qType || obj.type)
  qType: QuestionType;

  // MCQ
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => McqOptionDto)
  options?: McqOptionDto[];

  // TRUE/FALSE
  @IsOptional()
  @IsBoolean()
  answerKeyBoolean?: boolean;

  // FILL
  @IsOptional()
  fillExact?: string | string[]; // الإجابة لحقل أكمل الفراغ (يمكن أن يكون string أو array)

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regexList?: string[];

  // MATCH
  @IsOptional()
  @IsArray()
  answerKeyMatch?: [string, string][];

  // REORDER
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  answerKeyReorder?: string[];

  // فلاتر
  @IsOptional()
  @Transform(({ value }) => normalizeProvider(value))
  @IsEnum(ProviderEnum)
  provider?: ProviderEnum;
  @IsOptional() @IsString() section?: string;
  @IsOptional() @IsString() level?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];

  // للحقول الخاصة بـ Leben in Deutschland
  @IsOptional()
  @Transform(({ value }) => normalizeSkill(value))
  @IsEnum(ExamSkillEnum)
  mainSkill?: ExamSkillEnum;
  @IsOptional() @IsString() usageCategory?: string; // "common" | "state_specific"
  @IsOptional() @IsString() state?: string; // للأسئلة الخاصة بالولايات

  // حالة ابتدائية اختيارية
  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;

  // وسائط
  @IsOptional()
  @ValidateNested()
  @Type(() => QuestionMediaDto)
  media?: QuestionMediaDto;

  // مصفوفة من الصور (للدعم المتعدد)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionMediaDto)
  images?: QuestionMediaDto[];

  // رابط ملف الصوت (لأسئلة الاستماع) - للتوافق مع الكود القديم
  @IsOptional()
  @IsString()
  audioUrl?: string;

  // ربط بكليب الاستماع (لأسئلة Hören)
  @IsOptional()
  @IsMongoId()
  listeningClipId?: string;

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
  @ValidateIf((o) => o.qType === QuestionType.INTERACTIVE_TEXT)
  @IsOptional()
  @IsString()
  interactiveText?: string; // النص التفاعلي مع placeholders مثل {{a}}, {{b}}

  @ValidateIf((o) => o.qType === QuestionType.INTERACTIVE_TEXT)
  @IsOptional()
  @IsString()
  @MinLength(1)
  text?: string; // للتوافق مع الكود القديم - النص مع placeholders مثل {{a}}, {{b}}

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

  // ربط بامتحان (اختياري) - لإضافة السؤال لامتحان معين عند الإنشاء
  @IsOptional()
  @IsMongoId()
  examId?: string;
}
