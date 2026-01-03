import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PracticeMode {
  GENERAL = 'general',
  STATE = 'state',
}

export class CreatePracticeModeDto {
  @ApiProperty({
    enum: PracticeMode,
    description: 'نوع التمرين: general (300 سؤال عام) أو state (160 سؤال ولادي)',
  })
  @IsEnum(PracticeMode)
  mode: PracticeMode;

  @ApiProperty({
    required: false,
    description: 'اسم الولاية (مطلوب إذا كان mode=state) - مثل: Berlin, Bayern, Hamburg',
  })
  @IsOptional()
  @IsString()
  state?: string;
}

