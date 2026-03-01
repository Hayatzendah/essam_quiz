import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class AnswerOneDto {
  // طريقة التحديد: يا إمّا by index داخل items، أو by questionId
  @IsOptional()
  @IsNumber()
  @Min(0)
  itemIndex?: number;

  @IsOptional()
  @IsMongoId()
  questionId?: string;

  // أنواع الإجابات المحتملة (واحد فقط حسب qType)

  // MCQ / TRUE_FALSE: indexes (الشكل الجديد)
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  selectedOptionIndexes?: number[];

  // MCQ / TRUE_FALSE: indexes (للتوافق مع الكود القديم)
  @IsOptional()
  @IsArray()
  studentAnswerIndexes?: number[];

  // Fill / Free Text
  @IsOptional()
  @IsString()
  studentAnswerText?: string;

  @IsOptional()
  @IsString()
  answerText?: string;

  @IsOptional()
  @IsString()
  fillAnswers?: string;

  @IsOptional()
  @IsString()
  textAnswer?: string;

  // True/False
  @IsOptional()
  @IsBoolean()
  studentAnswerBoolean?: boolean;

  // Match: أزواج [left, right]
  @IsOptional()
  @IsArray()
  studentAnswerMatch?: [string, string][];

  // Reorder: ترتيب الطالب
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  studentAnswerReorder?: string[];

  // Sprechen: مفتاح الملف الصوتي
  @IsOptional()
  @IsString()
  studentAnswerAudioKey?: string;

  // INTERACTIVE_TEXT: fill-in-the-blanks
  @IsOptional()
  @IsObject()
  interactiveAnswers?: Record<string, string>;

  @IsOptional()
  @IsObject()
  studentInteractiveAnswers?: Record<string, string>;

  // INTERACTIVE_TEXT: reorder
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reorderAnswer?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  studentReorderAnswer?: string[];

  // دعم userAnswer العام من الفرونت
  @IsOptional()
  userAnswer?: any;
}
