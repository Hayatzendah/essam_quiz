import { IsArray, IsBoolean, IsMongoId, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AnswerOneDto {
  // طريقة التحديد: يا إمّا by index داخل items، أو by questionId
  @IsOptional() @IsNumber() @Min(0)
  itemIndex?: number;

  @IsOptional() @IsMongoId()
  questionId?: string;

  // أنواع الإجابات المحتملة (واحد فقط حسب qType)
  @IsOptional() @IsArray()
  studentAnswerIndexes?: number[]; // mcq

  @IsOptional() @IsString()
  studentAnswerText?: string;      // fill

  @IsOptional() @IsBoolean()
  studentAnswerBoolean?: boolean;  // true_false

  @IsOptional() @IsArray()
  studentAnswerMatch?: [string, string][]; // match: أزواج [left, right]

  @IsOptional() @IsArray() @IsString({ each: true })
  studentAnswerReorder?: string[]; // reorder: ترتيب الطالب

  @IsOptional() @IsString()
  studentAnswerAudioKey?: string;  // Sprechen: مفتاح الملف الصوتي (من /media/upload/student)
}

