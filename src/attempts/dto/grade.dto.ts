import { IsArray, IsMongoId, IsNumber, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ManualItemGradeDto {
  @IsMongoId() questionId: string;
  @IsNumber() @Min(0) score: number;
}

export class GradeAttemptDto {
  // attemptId يأتي من URL parameter
  @IsArray() @ValidateNested({ each: true }) @Type(() => ManualItemGradeDto)
  items: ManualItemGradeDto[];
}

