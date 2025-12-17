import { PartialType } from '@nestjs/mapped-types';
import { CreateQuestionDto } from './create-question.dto';
import { IsEnum, IsOptional, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';
import { QuestionStatus, QuestionType } from '../schemas/question.schema';

export class UpdateQuestionDto extends PartialType(CreateQuestionDto) {
  // type كـ alias لـ qType (للتوافق مع الفرونت)
  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  // qType: يمكن إرساله من الـ Frontend لكن سيتم تجاهله إذا كان نفس القيمة الحالية
  // أو رفضه إذا كان مختلفاً (يتم التحقق في الـ service)
  @IsOptional()
  @IsEnum(QuestionType)
  @Transform(({ obj }) => obj.qType || obj.type)
  qType?: QuestionType;

  // نسمح بتعديل الحالة
  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;

  // MATCH fields - إضافة صريحة لضمان عدم حذفها بواسطة ValidationPipe
  @IsOptional()
  @IsArray()
  answerKeyMatch?: [string, string][];

  // REORDER fields - إضافة صريحة لضمان عدم حذفها بواسطة ValidationPipe
  @IsOptional()
  @IsArray()
  answerKeyReorder?: string[];
}
