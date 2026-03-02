import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsArray, ArrayMinSize, IsIn } from 'class-validator';
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

  @ApiProperty({ description: 'الأقسام التي يظهر فيها المستوى', example: ['grammatik', 'wortschatz'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsIn(['grammatik', 'wortschatz', 'pruefungen', 'leben_in_deutschland'], { each: true })
  sections: string[];
}
