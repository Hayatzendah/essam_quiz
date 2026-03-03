import { IsOptional, IsString } from 'class-validator';

export class QueryNounDto {
  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  isActive?: string;
}
