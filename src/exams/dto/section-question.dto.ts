import {
  IsArray,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AddQuestionToSectionDto {
  @IsMongoId()
  @IsNotEmpty()
  questionId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  points?: number; // default 1
}

export class ReorderSectionQuestionsDto {
  @IsArray()
  @IsMongoId({ each: true })
  questionIds: string[];
}
