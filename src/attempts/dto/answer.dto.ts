import { IsArray, IsBoolean, IsMongoId, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AnswerOneDto {
  // طريقة التحديد: يا إمّا by index داخل items، أو by questionId
  @IsOptional() @IsNumber() @Min(0)
  itemIndex?: number;

  @IsOptional() @IsMongoId()
  questionId?: string;

  // أنواع الإجابات المحتملة (واحد فقط حسب qType)
  @IsOptional() @IsArray()
  studentAnswerIndexes?: number[]; // mcq

  @IsOptional() @IsString()
  studentAnswerText?: string;      // fill

  @IsOptional() @IsBoolean()
  studentAnswerBoolean?: boolean;  // true_false
}

