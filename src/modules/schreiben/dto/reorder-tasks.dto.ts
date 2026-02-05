import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class ReorderSchreibenTasksDto {
  @ApiProperty({
    description: 'مصفوفة معرفات المهام بالترتيب المطلوب',
    type: [String],
    example: ['task_id_1', 'task_id_2', 'task_id_3'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  taskIds: string[];
}
