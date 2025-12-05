import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class StartLebenExamDto {
  @IsMongoId()
  @IsNotEmpty()
  examId: string;

  @IsString()
  @IsNotEmpty()
  state: string; // Bundesland name, e.g. "Berlin", "Bayern"
}

