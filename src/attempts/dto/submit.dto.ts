import {
  ArrayMinSize,
  IsArray,
  IsMongoId,
  IsString,
  ValidateNested,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsNotEmpty,
  Min,
  MaxLength,
  ValidateIf,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

// DTO لـ studentRecording
class StudentRecordingDto {
  @IsString()
  @IsNotEmpty()
  url: string; // "/uploads/audio/answer-123.webm"

  @IsString()
  @IsNotEmpty()
  mime: string; // "audio/webm"
}

export class SubmitAttemptAnswerDto {
  @IsMongoId()
  @IsNotEmpty()
  questionId: string;


  // لأسئلة الكتابة (FREE_TEXT)
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'textAnswer must not exceed 2000 characters' })
  textAnswer?: string;

  // لأسئلة Fill blank - النص
  @ValidateIf((o) => !o.selectedOptionIndexes || o.selectedOptionIndexes.length === 0)
  @IsOptional()
  @IsString()
  answerText?: string;

  // للتوافق مع الكود القديم - fillAnswers (يتم تحويله تلقائياً إلى answerText)
  @IsOptional()
  @IsString()
  fillAnswers?: string;

  // لأسئلة الاختيار / صح وغلط - استخدام indexes (0-based)
  // للـ MCQ: indexes للخيارات المختارة
  // للـ True/False: 0 = false, 1 = true
  @ValidateIf((o) => !o.answerText && !o.textAnswer)
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'selectedOptionIndexes must contain at least 1 element' })
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  selectedOptionIndexes?: number[];

  // لأسئلة التحدث (SPEAKING) - تسجيل صوتي
  @IsOptional()
  @ValidateNested()
  @Type(() => StudentRecordingDto)
  studentRecording?: StudentRecordingDto; // { url: string, mime: string }

  // للتوافق مع الكود القديم - يمكن إرسال audioAnswer كـ string
  @IsOptional()
  @IsString()
  audioAnswer?: string; // للتوافق مع الكود القديم

  // للتوافق مع الكود القديم - للـ MCQ: indexes كـ numbers (0-based)
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  studentAnswerIndexes?: number[];

  // للتوافق مع الكود القديم - للـ Fill: النص
  @IsOptional()
  @IsString()
  studentAnswerText?: string;

  // للتوافق مع الكود القديم - للـ True/False: boolean (يتم تحويله إلى index)
  @IsOptional()
  @IsBoolean()
  studentAnswerBoolean?: boolean;

  // للتوافق مع الكود القديم - للـ Match: أزواج [left, right]
  @IsOptional()
  @IsArray()
  studentAnswerMatch?: [string, string][];

  // للتوافق مع الكود القديم - للـ Reorder: ترتيب
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  studentAnswerReorder?: string[];

  // لأسئلة INTERACTIVE_TEXT - Fill-in-the-blanks: map من blankId -> userAnswer
  // مثال: { "a": "bin", "b": "komme", "c": "Deutschland" }
  @IsOptional()
  @IsObject()
  interactiveAnswers?: Record<string, string>;

  // للتوافق مع الكود القديم - للـ INTERACTIVE_TEXT
  @IsOptional()
  @IsObject()
  studentInteractiveAnswers?: Record<string, string>;

  // لأسئلة INTERACTIVE_TEXT - Reorder: array of part ids بالترتيب اللي الطالب حطه
  // مثال: ["1", "2", "3", "4"]
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reorderAnswer?: string[];

  // للتوافق مع الكود القديم - للـ INTERACTIVE_TEXT Reorder
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  studentReorderAnswer?: string[];

  // للتوافق مع الكود القديم
  @IsOptional()
  @IsNumber()
  itemIndex?: number;

  @IsOptional()
  userAnswer?: any;
}

export class SubmitAttemptDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubmitAttemptAnswerDto)
  answers: SubmitAttemptAnswerDto[];
}

// للتوافق مع الكود القديم - استخدام SubmitAttemptDto بدلاً من SubmitAttemptSubmitDto
export class SubmitAttemptSubmitDto extends SubmitAttemptDto {}

// DTO لإرسال إجابات نموذج Schreiben
export class SubmitSchreibenFormAnswerDto {
  @IsString()
  @IsNotEmpty()
  fieldId: string;

  @IsNotEmpty({ message: 'يجب ملء جميع الحقول' })
  answer: string | string[];
}

export class SubmitSchreibenAttemptDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'يجب إرسال إجابة واحدة على الأقل' })
  @ValidateNested({ each: true })
  @Type(() => SubmitSchreibenFormAnswerDto)
  formAnswers: SubmitSchreibenFormAnswerDto[];
}
