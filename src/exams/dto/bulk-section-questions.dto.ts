import {
  IsArray,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateQuestionDto } from '../../questions/dto/create-question.dto';

export class BulkQuestionItemDto extends CreateQuestionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  points?: number; // default 1
}

class ReadingCardDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsString()
  color?: string;
}

export class BulkCreateSectionQuestionsDto {
  @IsOptional()
  @IsMongoId()
  listeningClipId?: string;

  @IsOptional()
  @IsString()
  readingPassage?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReadingCardDto)
  readingCards?: ReadingCardDto[];

  @IsOptional()
  @IsString()
  cardsLayout?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkQuestionItemDto)
  questions: BulkQuestionItemDto[];
}
