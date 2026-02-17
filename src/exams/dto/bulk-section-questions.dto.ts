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

// --- Content Blocks DTOs (Sprechen وغيرها) ---

class ContentBlockImageItemDto {
  @IsString()
  key: string;

  @IsString()
  url: string;

  @IsString()
  mime: string;

  @IsOptional()
  @IsString()
  description?: string;
}

class CardTextEntryDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsString()
  @MinLength(1)
  content: string;
}

class EnhancedCardDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CardTextEntryDto)
  texts: CardTextEntryDto[];

  @IsOptional()
  @IsString()
  color?: string;
}

class ContentBlockDto {
  @IsString()
  type: 'paragraph' | 'image' | 'cards' | 'questions';

  @IsInt()
  @Min(0)
  @Type(() => Number)
  order: number;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentBlockImageItemDto)
  images?: ContentBlockImageItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnhancedCardDto)
  cards?: EnhancedCardDto[];

  @IsOptional()
  @IsString()
  cardsLayout?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  questionCount?: number;
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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentBlockDto)
  contentBlocks?: ContentBlockDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkQuestionItemDto)
  questions?: BulkQuestionItemDto[];
}
