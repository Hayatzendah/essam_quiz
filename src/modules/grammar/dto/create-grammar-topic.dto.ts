import { IsString, IsOptional, IsArray, MinLength, IsEnum, IsMongoId } from 'class-validator';

export class CreateGrammarTopicDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  slug?: string;

  @IsString()
  @IsEnum(['A1', 'A2', 'B1', 'B2', 'C1'])
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  contentHtml?: string;

  @IsOptional()
  @IsMongoId()
  examId?: string;

  @IsOptional()
  @IsString()
  sectionTitle?: string;
}



