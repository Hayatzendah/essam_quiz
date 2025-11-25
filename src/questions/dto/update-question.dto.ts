import { PartialType } from '@nestjs/mapped-types';
import { CreateQuestionDto } from './create-question.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { QuestionStatus, QuestionType } from '../schemas/question.schema';

export class UpdateQuestionDto extends PartialType(CreateQuestionDto) {
  // qType: يمكن إرساله من الـ Frontend لكن سيتم تجاهله إذا كان نفس القيمة الحالية
  // أو رفضه إذا كان مختلفاً (يتم التحقق في الـ service)
  @IsOptional()
  @IsEnum(QuestionType)
  qType?: QuestionType;

  // نسمح بتعديل الحالة
  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;
}
