import { IsMongoId, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkExamDto {
  @ApiProperty({
    type: String,
    description: 'Exam ID to link with the grammar topic',
    example: '6929bfed58d67e05dec3deb6',
  })
  @IsNotEmpty()
  @IsMongoId()
  examId: string;
}



