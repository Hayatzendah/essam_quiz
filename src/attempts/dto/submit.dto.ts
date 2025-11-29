<<<<<<< HEAD
import { IsArray, IsMongoId, IsString, ValidateNested, IsOptional, IsBoolean, IsNumber } from 'class-validator';
=======
import { IsArray, IsMongoId, IsString, ValidateNested } from 'class-validator';
>>>>>>> 2cc526b920b1e4e6fa6ac9cc1edbf2cd70c627d8
import { Type } from 'class-transformer';

class SubmitAttemptAnswerDto {
  @IsMongoId()
  questionId: string;

<<<<<<< HEAD
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
=======
  @IsArray()
  @IsString({ each: true }) // 👈 مهم جداً: string مش MongoId
  selectedOptionIds: string[];
}

export class SubmitAttemptSubmitDto {
  @IsArray()
>>>>>>> 2cc526b920b1e4e6fa6ac9cc1edbf2cd70c627d8
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
