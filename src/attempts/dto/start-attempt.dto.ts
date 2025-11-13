import { IsMongoId, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartAttemptDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Exam ID to start attempt for' })
  @IsMongoId() @IsNotEmpty()
  examId: string;
}



