import { IsArray, IsMongoId, IsOptional } from 'class-validator';

export class AssignExamDto {
  @IsOptional()
  @IsMongoId()
  classId?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  studentIds?: string[];
}
