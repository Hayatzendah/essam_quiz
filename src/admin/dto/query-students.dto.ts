import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum StudentLevel {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
}

export enum StudentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
}

export enum ActivityFilter {
  HAS_ATTEMPTS = 'hasAttempts',
  NO_ATTEMPTS = 'noAttempts',
}

export class QueryStudentsDto {
  @IsOptional()
  @IsString()
  search?: string; // اسم أو إيميل الطالب

  @IsOptional()
  @IsEnum(StudentLevel)
  level?: StudentLevel; // A1 | A2 | B1 | B2 | C1

  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus; // active | inactive | blocked

  @IsOptional()
  @IsEnum(ActivityFilter)
  activity?: ActivityFilter; // hasAttempts | noAttempts

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1; // رقم الصفحة

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10; // عدد النتائج في الصفحة
}

