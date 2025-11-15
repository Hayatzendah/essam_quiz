import { PartialType } from '@nestjs/mapped-types';
import { CreateQuestionDto } from './create-question.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { QuestionStatus, QuestionType } from '../schemas/question.schema';

export class UpdateQuestionDto extends PartialType(CreateQuestionDto) {
  // لا نسمح بتغيير نوع السؤال بعد الإنشاء
  @IsOptional()
  @IsEnum(QuestionType, { message: 'qType cannot be updated' })
  declare qType?: never;

  // نسمح بتعديل الحالة
  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;
}





