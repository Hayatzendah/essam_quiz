import { IsArray, IsMongoId, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SubmitAttemptAnswerDto {
  @IsMongoId()
  questionId: string;

  @IsArray()
  @IsString({ each: true }) // 👈 مهم جداً: string مش MongoId
  selectedOptionIds: string[];
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
