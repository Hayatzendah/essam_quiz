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
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (!value) return [];
    if (typeof value === 'string') return [value];
    return value;
  })
  tags?: string[]; // مصفوفة tags للفلترة حسب الموضوع

  @IsOptional()
  @IsString()
  page?: string; // للـ pagination

  @IsOptional()
  @IsString()
  limit?: string; // للـ pagination
}

