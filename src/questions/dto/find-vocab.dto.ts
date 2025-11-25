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

    // إذا كان string واحد (مثل: "akkusativ" أو "akkusativ,cases")
    if (typeof value === 'string') {
      // إذا كان comma-separated، نقسمه
      if (value.includes(',')) {
        return value
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean);
      }
      return [value];
    }

    // إذا كان array بالفعل (من tags[]=value1&tags[]=value2 أو tags=value1&tags=value2)
    if (Array.isArray(value)) {
      return value;
    }

    // إذا كان object (من tags[0]=value1&tags[1]=value2) - NestJS يحوله لـ object
    if (typeof value === 'object') {
      return Object.values(value).filter(Boolean);
    }

    return [];
  })
  tags?: string[]; // مصفوفة tags للفلترة حسب الموضوع

  @IsOptional()
  @IsString()
  page?: string; // للـ pagination

  @IsOptional()
  @IsString()
  limit?: string; // للـ pagination
}
