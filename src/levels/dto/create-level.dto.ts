import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLevelDto {
  @ApiProperty({ description: 'اسم المستوى', example: 'C2' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false, description: 'عنوان العرض' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ required: false, description: 'الترتيب' })
  @IsOptional()
  @IsNumber()
  position?: number;

  @ApiProperty({ required: false, description: 'نشط أم لا', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
