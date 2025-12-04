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
} from 'class-validator';
import { Type } from 'class-transformer';

export class SubmitAttemptAnswerDto {
  @IsMongoId()
  @IsNotEmpty()
  questionId: string;

  // لأسئلة الاختيار / صح وغلط - array of option IDs (MongoIds)
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  selectedOptionIds?: string[];

  // لأسئلة الكتابة (FREE_TEXT)
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'textAnswer must not exceed 2000 characters' })
  textAnswer?: string;

  // لأسئلة التحدث (SPEAKING) - رابط ملف الصوت المسجل
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  audioUrl?: string;

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

  // للتوافق مع الكود القديم - للـ True/False: boolean
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
