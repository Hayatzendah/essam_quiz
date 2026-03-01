import { IsMongoId, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteLevelDto {
  @ApiProperty({ description: 'معرف المستوى البديل لنقل العناصر إليه' })
  @IsMongoId()
  @IsNotEmpty()
  reassignTo: string;
}
