import {
  IsArray,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  Min,
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

export class BulkCreateSectionQuestionsDto {
  @IsOptional()
  @IsMongoId()
  listeningClipId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkQuestionItemDto)
  questions: BulkQuestionItemDto[];
}
