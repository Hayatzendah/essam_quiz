import { IsArray, IsBoolean, IsMongoId, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SubmitAnswerDto {
  @IsOptional()
  @IsString()
  itemId?: string; // questionId أو itemIndex (string)

  @IsOptional()
  @IsNumber()
  itemIndex?: number; // رقم السؤال في attempt (0-based) - أفضل من itemId

  @IsOptional()
  userAnswer?: string | number | boolean | number[];
}

export class SubmitAttemptDto {
  // attemptId يأتي من URL parameter
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerDto)
  answers?: SubmitAnswerDto[]; // اختياري - إذا تم إرسال الإجابات هنا، سيتم حفظها قبل التصحيح
}

