import { IsNotEmpty, IsString, IsOptional, IsBoolean, IsNumber, Min, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNounDto {
  @ApiProperty({ description: 'Article: der, die, or das', enum: ['der', 'die', 'das'] })
  @IsNotEmpty()
  @IsIn(['der', 'die', 'das'])
  article: string;

  @ApiProperty({ description: 'Singular form of the noun' })
  @IsNotEmpty()
  @IsString()
  singular: string;

  @ApiProperty({ description: 'Plural form of the noun' })
  @IsNotEmpty()
  @IsString()
  plural: string;

  @ApiProperty({ description: 'Level: A1, A2, B1, B2, C1, C2' })
  @IsNotEmpty()
  @IsString()
  level: string;

  @ApiProperty({ required: false, description: 'Display order' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;

  @ApiProperty({ required: false, description: 'Whether the noun is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
