import { IsNotEmpty, IsString, IsArray, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class BulkNounItemDto {
  @ApiProperty({ enum: ['der', 'die', 'das'] })
  @IsNotEmpty()
  @IsIn(['der', 'die', 'das'])
  article: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  singular: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  plural: string;
}

export class CreateBulkNounsDto {
  @ApiProperty({ description: 'Level for all nouns' })
  @IsNotEmpty()
  @IsString()
  level: string;

  @ApiProperty({ type: [BulkNounItemDto] })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkNounItemDto)
  nouns: BulkNounItemDto[];
}
