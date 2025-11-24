import { IsArray, IsBoolean, IsMongoId, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SubmitAnswerDto {
  @IsOptional()
  @IsString()
  itemId?: string;

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

