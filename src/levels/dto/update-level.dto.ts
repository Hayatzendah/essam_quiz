import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, ArrayMinSize, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateLevelDto {
  @ApiProperty({ required: false, description: 'اسم المستوى' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false, description: 'عنوان العرض' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ required: false, description: 'الترتيب' })
  @IsOptional()
  @IsNumber()
  position?: number;

  @ApiProperty({ required: false, description: 'نشط أم لا' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false, description: 'الأقسام التي يظهر فيها المستوى' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsIn(['grammatik', 'wortschatz', 'pruefungen', 'leben_in_deutschland'], { each: true })
  sections?: string[];
}
