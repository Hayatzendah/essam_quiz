import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class ReorderTopicsDto {
  @ApiProperty({
    description: 'مصفوفة معرفات المواضيع بالترتيب المطلوب',
    type: [String],
    example: ['topic_id_1', 'topic_id_2', 'topic_id_3'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  topicIds: string[];
}
