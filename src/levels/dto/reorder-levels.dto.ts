import { IsArray, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderLevelsDto {
  @ApiProperty({ description: 'مصفوفة معرفات المستويات بالترتيب الجديد', type: [String] })
  @IsArray()
  @IsMongoId({ each: true })
  levelIds: string[];
}
