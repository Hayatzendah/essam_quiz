import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionStatus, QuestionType } from '../schemas/question.schema';

class McqOptionDto {
  @IsString()
  @MinLength(1)
  text: string;

  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;
}

class QuestionMediaDto {
  @IsEnum(['audio', 'image', 'video'])
  type: 'audio' | 'image' | 'video';

  @IsString()
  key: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  mime?: string;

  @IsOptional()
  @IsIn(['s3', 'cloudinary'])
  provider?: 's3' | 'cloudinary';
}

export class CreateQuestionDto {
  @IsString()
  @MinLength(3)
  prompt: string;

  @IsEnum(QuestionType)
  qType: QuestionType;

  // MCQ
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => McqOptionDto)
  options?: McqOptionDto[];

  // TRUE/FALSE
  @IsOptional()
  @IsBoolean()
  answerKeyBoolean?: boolean;

  // FILL
  @IsOptional()
  @IsString()
  fillExact?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regexList?: string[];

  // MATCH
  @IsOptional()
  @IsArray()
  answerKeyMatch?: [string, string][];

  // REORDER
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  answerKeyReorder?: string[];

  // فلاتر
  @IsOptional() @IsString() provider?: string;
  @IsOptional() @IsString() section?: string;
  @IsOptional() @IsString() level?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];

  // حالة ابتدائية اختيارية
  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;

  // وسائط
  @IsOptional()
  @ValidateNested()
  @Type(() => QuestionMediaDto)
  media?: QuestionMediaDto;

  // رابط ملف الصوت (لأسئلة الاستماع) - للتوافق مع الكود القديم
  @IsOptional()
  @IsString()
  audioUrl?: string;

  // ربط بكليب الاستماع (لأسئلة Hören)
  @IsOptional()
  @IsMongoId()
  listeningClipId?: string;
}
