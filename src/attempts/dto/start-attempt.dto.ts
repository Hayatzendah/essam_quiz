import { IsEnum, IsMongoId, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartAttemptDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Exam ID to start attempt for' })
  @IsMongoId()
  @IsNotEmpty()
  examId: string;

  @ApiProperty({
    example: 'exam',
    description: 'Mode of attempt: exam or training',
    enum: ['exam', 'training'],
    required: false,
    default: 'exam',
  })
  @IsOptional()
  @IsEnum(['exam', 'training'])
  mode?: 'exam' | 'training';
}
