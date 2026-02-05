import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProviderEnum } from '../../../common/enums/provider.enum';
import { SchreibenTaskStatus } from '../schemas/schreiben-task.schema';
import { SchreibenContentBlockDto } from './schreiben-content-block.dto';

export class CreateSchreibenTaskDto {
  @ApiProperty({ description: 'عنوان المهمة', example: 'Parkplatzreservierung' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ required: false, description: 'وصف المهمة' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
    description: 'المستوى',
    example: 'A1',
  })
  @IsEnum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
  level: string;

  @ApiProperty({
    required: false,
    enum: ProviderEnum,
    description: 'الجهة المنظمة',
    example: 'goethe',
  })
  @IsOptional()
  @IsEnum(ProviderEnum)
  provider?: ProviderEnum;

  @ApiProperty({
    required: false,
    type: [SchreibenContentBlockDto],
    description: 'بلوكات المحتوى',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SchreibenContentBlockDto)
  contentBlocks?: SchreibenContentBlockDto[];

  @ApiProperty({
    required: false,
    enum: SchreibenTaskStatus,
    description: 'حالة المهمة',
    default: 'draft',
  })
  @IsOptional()
  @IsEnum(SchreibenTaskStatus)
  status?: SchreibenTaskStatus;

  @ApiProperty({ required: false, description: 'وقت المهمة بالدقائق' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  timeLimitMin?: number;

  @ApiProperty({ required: false, description: 'أقصى درجة' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPoints?: number;

  @ApiProperty({ required: false, type: [String], description: 'الوسوم' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ required: false, description: 'تعليمات للطالب' })
  @IsOptional()
  @IsString()
  instructions?: string;
}
