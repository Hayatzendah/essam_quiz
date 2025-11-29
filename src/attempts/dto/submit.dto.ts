import { IsArray, IsMongoId, IsString, ValidateNested, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class SubmitAttemptAnswerDto {
  @IsMongoId()
  questionId: string;

  // للـ MCQ: indexes كـ strings (0-based)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedOptionIds?: string[];

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

export class SubmitAttemptSubmitDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitAttemptAnswerDto)
  answers: SubmitAttemptAnswerDto[];
}

// للتوافق مع الكود القديم
export class SubmitAttemptDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitAttemptAnswerDto)
  answers?: SubmitAttemptAnswerDto[];
}
