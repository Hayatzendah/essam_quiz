import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LearnGeneralQuestionsDto {
  @ApiProperty({ required: false, default: 1, minimum: 1, description: 'رقم الصفحة' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 20, minimum: 1, maximum: 100, description: 'عدد النتائج في الصفحة' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class LearnStateQuestionsDto {
  @ApiProperty({ required: true, description: 'اسم الولاية الألمانية (مثل: Berlin, Bayern, Hamburg)' })
  @IsString()
  state: string;

  @ApiProperty({ required: false, default: 1, minimum: 1, description: 'رقم الصفحة' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 20, minimum: 1, maximum: 100, description: 'عدد النتائج في الصفحة' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

