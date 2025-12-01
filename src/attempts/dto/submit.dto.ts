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
} from 'class-validator';
import { Type } from 'class-transformer';

export class SubmitAttemptAnswerDto {
  @IsMongoId()
  @IsNotEmpty()
  questionId: string;

  // للـ MCQ: indexes كـ numbers (0-based)
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  studentAnswerIndexes?: number[];

  // للـ Fill: النص
  @IsOptional()
  @IsString()
  studentAnswerText?: string;

  // للـ True/False: boolean
  @IsOptional()
  @IsBoolean()
  studentAnswerBoolean?: boolean;

  // للـ Match: أزواج [left, right]
  @IsOptional()
  @IsArray()
  studentAnswerMatch?: [string, string][];

  // للـ Reorder: ترتيب
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
