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
  IsBoolean,
  ArrayMinSize,
  IsObject,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  SchreibenBlockType,
  FormFieldType,
} from '../schemas/schreiben-content-block.schema';

// DTO لحقل الاستمارة
export class FormFieldDto {
  @ApiProperty({ description: 'معرف الحقل', example: 'field_1' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'رقم الحقل', example: 1 })
  @IsNumber()
  @Min(1)
  number: number;

  @ApiProperty({ description: 'عنوان الحقل', example: 'Vorname' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({
    enum: FormFieldType,
    description: 'نوع الحقل',
    example: 'text_input',
  })
  @IsEnum(FormFieldType)
  fieldType: FormFieldType;

  @ApiProperty({
    required: false,
    description: 'القيمة (للـ prefilled) أو الإجابة الصحيحة (للـ text_input)',
    example: 'Klara',
  })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiProperty({
    required: false,
    description: 'الخيارات (للـ select و multiselect)',
    type: [String],
    example: ['Bar', 'Banküberweisung', 'Kreditkarte'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiProperty({
    required: false,
    description: 'الإجابات الصحيحة (للـ select و multiselect)',
    type: [String],
    example: ['Banküberweisung'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  correctAnswers?: string[];

  @ApiProperty({
    description: 'هل هذا حقل يملأه الطالب؟',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isStudentField?: boolean;

  @ApiProperty({
    required: false,
    description: 'تلميح اختياري',
    example: 'اكتب اسمك الأول',
  })
  @IsOptional()
  @IsString()
  hint?: string;
}

// DTO لبيانات بلوك النص
export class TextBlockDataDto {
  @ApiProperty({ description: 'المحتوى النصي', example: 'اقرأ النص التالي وأجب عن الأسئلة' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

// DTO لبيانات بلوك الاستمارة
export class FormBlockDataDto {
  @ApiProperty({ description: 'عنوان الاستمارة', example: 'Reservierungsformular' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ type: [FormFieldDto], description: 'حقول الاستمارة' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  fields: FormFieldDto[];
}

// DTO لبيانات بلوك الصورة
export class ImageBlockDataDto {
  @ApiProperty({ description: 'رابط الصورة', example: 'https://...' })
  @IsString()
  @IsNotEmpty()
  src: string;

  @ApiProperty({ required: false, description: 'نص بديل' })
  @IsOptional()
  @IsString()
  alt?: string;

  @ApiProperty({ required: false, description: 'تعليق تحت الصورة' })
  @IsOptional()
  @IsString()
  caption?: string;
}

// DTO للبلوك الرئيسي
// ملاحظة: نستخدم @IsObject() بدلاً من @ValidateNested() لأن data هي union type
// والتحقق التفصيلي يتم في SchreibenTasksService.validateContentBlocks()
export class SchreibenContentBlockDto {
  @ApiProperty({ description: 'معرف البلوك', example: 'block_1' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    enum: SchreibenBlockType,
    description: 'نوع البلوك',
    example: 'form',
  })
  @IsEnum(SchreibenBlockType)
  type: SchreibenBlockType;

  @ApiProperty({
    description: 'بيانات البلوك (تختلف حسب النوع)',
    oneOf: [
      { $ref: '#/components/schemas/TextBlockDataDto' },
      { $ref: '#/components/schemas/FormBlockDataDto' },
      { $ref: '#/components/schemas/ImageBlockDataDto' },
    ],
  })
  @IsNotEmpty()
  @IsObject()
  @Transform(({ value }) => value, { toClassOnly: true }) // الحفاظ على البيانات كما هي
  data: Record<string, any>; // نستخدم Record بدلاً من union type لتجنب مشاكل whitelist
}

// DTO لتحديث بلوكات المحتوى
export class UpdateContentBlocksDto {
  @ApiProperty({
    type: [SchreibenContentBlockDto],
    description: 'بلوكات المحتوى',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SchreibenContentBlockDto)
  contentBlocks: SchreibenContentBlockDto[];
}
