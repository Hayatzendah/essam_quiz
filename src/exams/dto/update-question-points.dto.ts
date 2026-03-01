import { IsInt, IsNotEmpty, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateQuestionPointsDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  points: number;
}
