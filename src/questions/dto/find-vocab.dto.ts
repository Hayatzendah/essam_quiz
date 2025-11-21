import { IsEnum, IsOptional, IsString, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class FindVocabDto {
  @IsOptional()
  @IsEnum(['A1', 'A2', 'B1', 'B2', 'C1'])
  level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

  @IsOptional()
  @IsString()
  search?: string; // بحث نصي عن كلمة ألمانية في prompt

  @IsOptional()
  @Transform(({ value }) => {
    // إذا كان string واحد، حوله إلى array
    if (typeof value === 'string') {
      return [value];
    }
    // إذا كان array بالفعل، اتركه كما هو
    if (Array.isArray(value)) {
      return value;
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  tags?: string[]; // مصفوفة tags للفلترة حسب الموضوع

  @IsOptional()
  @IsString()
  page?: string; // للـ pagination

  @IsOptional()
  @IsString()
  limit?: string; // للـ pagination
}

