import { Transform } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GetGrammarQuestionsDto {
  @IsString()
  level: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return [];

    // إذا كان array
    if (Array.isArray(value)) {
      // إذا كان array من strings منفصلة ["akkusativ", "cases"]
      // أو array من comma-separated strings ["akkusativ,cases"]
      const result: string[] = [];
      for (const item of value) {
        if (typeof item === 'string') {
          if (item.includes(',')) {
            // comma-separated string
            result.push(
              ...item
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
            );
          } else {
            // single string
            result.push(item.trim());
          }
        }
      }
      return result.filter(Boolean);
    }

    // إذا كان string واحد (مثل: "akkusativ" أو "akkusativ,cases")
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    }

    // إذا كان object (من tags[0]=value1&tags[1]=value2) - NestJS يحوله لـ object
    if (typeof value === 'object') {
      return Object.values(value)
        .filter((v) => typeof v === 'string')
        .flatMap((v) =>
          v
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        );
    }

    return [];
  })
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 1 : parsed;
  })
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 20 : parsed;
  })
  @IsInt()
  @Min(1)
  limit?: number;
}



