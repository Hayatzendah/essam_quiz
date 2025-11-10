import { IsArray, IsMongoId, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ManualItemGradeDto {
  @IsMongoId() questionId: string;
  @IsNumber() @Min(0) score: number;
  @IsOptional() @IsString() feedback?: string; // ملاحظات المعلم
}

export class GradeAttemptDto {
  // attemptId يأتي من URL parameter
  @IsArray() @ValidateNested({ each: true }) @Type(() => ManualItemGradeDto)
  items: ManualItemGradeDto[];
}

