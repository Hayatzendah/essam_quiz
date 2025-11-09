import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested, ArrayMinSize } from 'class-validator';
import { ExamStatus } from '../schemas/exam.schema';

class SectionItemDto {
  @IsMongoId() questionId: string;
  @IsOptional() @IsNumber() @Min(0) points?: number;
}

class DifficultyDistributionDto {
  @IsOptional() @IsNumber() @Min(0) easy?: number;
  @IsOptional() @IsNumber() @Min(0) medium?: number;
  @IsOptional() @IsNumber() @Min(0) hard?: number;
}

class ExamSectionDto {
  @IsString() @IsNotEmpty() name: string;

  @IsOptional() @IsArray() @ArrayMinSize(1)
  @ValidateNested({ each: true }) @Type(() => SectionItemDto)
  items?: SectionItemDto[];

  @IsOptional() @IsNumber() @Min(1)
  quota?: number;

  @IsOptional() @ValidateNested() @Type(() => DifficultyDistributionDto)
  difficultyDistribution?: DifficultyDistributionDto;

  @IsOptional() @IsBoolean()
  randomize?: boolean;
}

export class CreateExamDto {
  @IsString() @IsNotEmpty() title: string;
  @IsOptional() @IsString() level?: string;

  @IsArray() @ArrayMinSize(1)
  @ValidateNested({ each: true }) @Type(() => ExamSectionDto)
  sections: ExamSectionDto[];

  @IsOptional() @IsBoolean()
  randomizeQuestions?: boolean;

  @IsOptional() @IsNumber() @Min(0)
  attemptLimit?: number;

  // اختياري: في حال أردت بدءًا بحالة غير الـ draft
  @IsOptional()
  status?: ExamStatus;
}

