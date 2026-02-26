import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ProviderEnum } from '../../common/enums/provider.enum';
import { normalizeProvider } from '../../common/utils/provider-normalizer.util';
import { normalizeSkill } from '../../common/utils/skill-normalizer.util';
import { ExamCategoryEnum, ExamSkillEnum, ExamStatusEnum } from '../../common/enums';

/**
 * أنواع الامتحانات (اختياري - للتوافق مع الفرونت)
 */
export enum ExamTypeEnum {
  GRAMMAR = 'grammar_exam',
  PROVIDER = 'provider_exam',
  LEBEN_TEST = 'leben_test',
}

/**
 * توزيع الصعوبة (اختياري داخل السكشن)
 * مهم: الاسم الرسمي هو medium وليس med
 */
export class DifficultyDistributionDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  easy?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  medium?: number; // مهم: medium وليس med

  @IsOptional()
  @IsInt()
  @Min(0)
  hard?: number;
}

/**
 * عنصر سؤال داخل سكشن (يُستخدم في القواعد لو عندك items ثابتة)
 */
export class SectionItemDto {
  @IsMongoId()
  @IsNotEmpty()
  questionId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  points?: number;
}

/**
 * سكشن امتحان – يدعم:
 *  - نظام القواعد (items ثابتة) - يستخدم name + items
 *  - نظام Prüfungen (quota + skill + teilNumber)
 *  - Leben in Deutschland (title + quota + teil)
 */
export class ExamSectionDto {
  // title أو name - واحد منهما مطلوب (للتوافق مع الفرونت والكود القديم)
  // الفرونت يرسل title، الكود القديم يرسل name
  @ValidateIf((o) => !o.name) // مطلوب إذا لم يكن name موجود
  @IsString()
  @IsNotEmpty()
  title?: string;            // "Leben in Deutschland – Teil 1" - الحقل الذي يرسله الفرونت

  @ValidateIf((o) => !o.title) // مطلوب إذا لم يكن title موجود
  @IsString()
  @IsNotEmpty()
  name?: string;             // "Hören – Teil 1" - للتوافق مع الكود القديم (يتم توحيده في Service)

  @IsOptional()
  @IsString()
  description?: string;      // وصف السكشن أو نص القراءة (اختياري)

  @IsOptional()
  @IsString()
  section?: string;          // نص إضافي لو حابة (عندك نفس القيمة)

  @IsOptional()
  @Transform(({ value }) => normalizeSkill(value))
  @IsEnum(ExamSkillEnum)
  skill?: ExamSkillEnum;     // hoeren / lesen / schreiben / sprechen / grammar / misc

  // teil مطلوب إذا لم يكن هناك items (يدعم teil أو teilNumber)
  @Transform(({ value, obj }) => value ?? obj.teilNumber)
  @Type(() => Number)
  @ValidateIf((o) => !o.items || o.items.length === 0)
  @IsInt()
  @Min(1)
  teil?: number;             // 1, 2, 3... - مطلوب إذا لم يكن items (يقبل teilNumber كـ alias)

  @IsOptional()
  @IsInt()
  @Min(1)
  teilNumber?: number;       // 1, 2, 3... - للتوافق مع الكود القديم (يتم تحويله إلى teil تلقائياً)

  // quota مطلوب إذا لم يكن هناك items
  @ValidateIf((o) => !o.items || o.items.length === 0)
  @IsInt()
  @Min(1)  // يجب أن يكون >= 1
  quota?: number;            // عدد الأسئلة في هذا القسم - مطلوب إذا لم يكن items (>= 1)

  @IsOptional()
  @ValidateNested()
  @Type(() => DifficultyDistributionDto)
  difficultyDistribution?: DifficultyDistributionDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  // فقط لامتحانات القواعد لو عندك سكشن بأسئلة ثابتة
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SectionItemDto)
  items?: SectionItemDto[];

  // حقول إضافية للتوافق مع الكود القديم
  @IsOptional()
  @IsMongoId()
  topicId?: string;          // للتوافق مع الكود القديم (اختياري)

  // للأسئلة السمعية (Hören) - معرف ملف الصوت
  @IsOptional()
  @IsMongoId()
  listeningAudioId?: string; // معرف ملف الصوت للقسم السمعي
}

/**
 * إنشاء امتحان جديد
 */
export class CreateExamDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  level: string;             // A1 / A2 / ...

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  timeLimitMin?: number;

  @IsEnum(ExamStatusEnum)
  status: ExamStatusEnum;

  @IsEnum(ExamCategoryEnum)
  examCategory: ExamCategoryEnum;

  @IsOptional()
  @IsEnum(ExamTypeEnum)
  examType?: ExamTypeEnum; // للتوافق مع الفرونت (leben_test)

  /** محتوى تعليمي: لا يظهر زر تسليم الامتحان في واجهة الطالب */
  @IsOptional()
  @IsBoolean()
  isEducational?: boolean;

  @IsOptional()
  @IsBoolean()
  randomizeQuestions?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  attemptsLimit?: number; // 0 = غير محدود (اسم الحقل: attemptsLimit)
  
  // للتوافق مع الكود القديم
  @IsOptional()
  @IsInt()
  @Min(0)
  attemptLimit?: number; // 0 = غير محدود (deprecated - استخدم attemptsLimit)

  // ========= حقول خاصة بالقواعد =========

  @IsOptional()
  @IsIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
  grammarLevel?: string; // A1, A2, B1, B2, C1, C2

  @IsOptional()
  @IsMongoId()
  grammarTopicId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  totalQuestions?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  questionTags?: string[];

  // ========= حقول خاصة بالكتابة (Schreiben) =========

  @IsOptional()
  @IsMongoId()
  schreibenTaskId?: string;

  // ========= حقول خاصة بـ Prüfungen =========

  @ValidateIf(o => o.examCategory === ExamCategoryEnum.PROVIDER)
  @Transform(({ value }) => normalizeProvider(value))
  @IsEnum(ProviderEnum)
  @IsNotEmpty()
  provider?: ProviderEnum;         // "goethe" / "telc" ... (case-insensitive)

  @ValidateIf(o => o.examCategory === ExamCategoryEnum.PROVIDER)
  @Transform(({ value }) => normalizeSkill(value))
  @IsEnum(ExamSkillEnum)
  @IsNotEmpty()
  mainSkill?: ExamSkillEnum;       // "hoeren" / "lesen" / "grammar" / "leben_test" ...

  // ========= مشتركة =========

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  // ======  sections نخليها اختيارية  ======
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamSectionDto)
  sections?: ExamSectionDto[];
}

// DTO للـ practice exam - يجعل title اختياري
export class CreatePracticeExamDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() level?: string;
  @IsOptional()
  @Transform(({ value }) => normalizeProvider(value))
  @IsEnum(ProviderEnum)
  provider?: ProviderEnum;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamSectionDto)
  sections: ExamSectionDto[];

  @IsOptional()
  @IsBoolean()
  randomizeQuestions?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  attemptLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  timeLimitMin?: number;

  @IsOptional()
  @IsString()
  resultsPolicy?:
    | 'only_scores'
    | 'correct_with_scores'
    | 'explanations_with_scores'
    | 'release_delayed';
}
