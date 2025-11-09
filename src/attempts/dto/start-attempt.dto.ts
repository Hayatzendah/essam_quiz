import { IsMongoId, IsNotEmpty } from 'class-validator';

export class StartAttemptDto {
  @IsMongoId() @IsNotEmpty()
  examId: string;
}

