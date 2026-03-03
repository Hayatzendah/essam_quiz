import { IsOptional, IsString, IsBoolean, IsNumber, Min, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateNounDto {
  @ApiProperty({ required: false, enum: ['der', 'die', 'das'] })
  @IsOptional()
  @IsIn(['der', 'die', 'das'])
  article?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  singular?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  plural?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
