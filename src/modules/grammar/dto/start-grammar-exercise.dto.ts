import { IsEnum, IsInt, IsNotEmpty, Min } from 'class-validator';

export enum ExamLevelEnum {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
}

export class StartGrammarExerciseDto {
  @IsNotEmpty()
  @IsEnum(ExamLevelEnum)
  level: ExamLevelEnum;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  questionsCount: number;
}



