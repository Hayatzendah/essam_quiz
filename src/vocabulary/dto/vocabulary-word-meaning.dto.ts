import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VocabularyWordMeaningDto {
  @ApiProperty({ description: 'نص المعنى' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ description: 'رمز اللغة (ar, en, fr, de, etc.)' })
  @IsString()
  @IsNotEmpty()
  language: string;
}
