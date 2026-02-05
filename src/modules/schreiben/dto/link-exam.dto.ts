import { IsMongoId, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkSchreibenExamDto {
  @ApiProperty({
    type: String,
    description: 'معرف الامتحان للربط مع مهمة الكتابة',
    example: '6929bfed58d67e05dec3deb6',
  })
  @IsNotEmpty()
  @IsMongoId()
  examId: string;
}
