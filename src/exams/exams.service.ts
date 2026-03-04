import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateExamDto, CreatePracticeExamDto } from './dto/create-exam.dto';
import { CreatePracticeModeDto, PracticeMode } from './dto/create-practice-mode.dto';
import { QueryExamDto } from './dto/query-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { AssignExamDto } from './dto/assign-exam.dto';
import { Exam, ExamDocument, ExamSection } from './schemas/exam.schema';
import {
  Question,
  QuestionDocument,
  QuestionStatus,
  QuestionType,
} from '../questions/schemas/question.schema';
import { Attempt, AttemptDocument } from '../attempts/schemas/attempt.schema';
import { ExamCategoryEnum, ExamStatusEnum } from '../common/enums';
import { ProviderEnum } from '../common/enums/provider.enum';
import { normalizeProvider } from '../common/utils/provider-normalizer.util';
import { AddSectionDto } from './dto/add-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { AddQuestionToSectionDto, ReorderSectionQuestionsDto } from './dto/section-question.dto';
import { BulkCreateSectionQuestionsDto } from './dto/bulk-section-questions.dto';
import {
  ListeningClip,
  ListeningClipDocument,
} from '../listening-clips/schemas/listening-clip.schema';
import { GrammarTopic } from '../modules/grammar/schemas/grammar-topic.schema';
import { MediaService } from '../modules/media/media.service';

type ReqUser = { userId: string; role: 'student' | 'teacher' | 'admin' };

@Injectable()
export class ExamsService {
  private readonly logger = new Logger(ExamsService.name);

  constructor(
    @InjectModel(Exam.name) private readonly model: Model<ExamDocument>,
    @InjectModel(Question.name) private readonly questionModel: Model<QuestionDocument>,
    @InjectModel(Attempt.name) private readonly attemptModel: Model<AttemptDocument>,
    @InjectModel(ListeningClip.name)
    private readonly listeningClipModel: Model<ListeningClipDocument>,
    @InjectModel(GrammarTopic.name) private readonly grammarTopicModel: Model<any>,
    private readonly mediaService: MediaService,
  ) {}

  private assertTeacherOrAdmin(user: ReqUser) {
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      throw new ForbiddenException('Only teachers/admins allowed');
    }
  }

  /**
   * التحقق من هيكل "Deutschland-in-Leben" Test
   * يجب أن يحتوي على قسمين:
   * 1. قسم الولاية: quota = 3, tags = [اسم الولاية]
   * 2. قسم الـ300: quota = 30, tags = ["300-Fragen"]
   */
  private validateDeutschlandInLebenStructure(dto: CreateExamDto) {
    // التحقق من level
    if (dto.level && dto.level !== 'B1') {
      throw new BadRequestException('Deutschland-in-Leben Test must have level "B1"');
    }

    // التحقق من عدد الأقسام
    if (!dto.sections || dto.sections.length !== 2) {
      throw new BadRequestException(
        'Deutschland-in-Leben Test must have exactly 2 sections: State section (3 questions) and 300 Fragen section (30 questions)',
      );
    }

    const [firstSection, secondSection] = dto.sections;

    // قائمة الولايات الألمانية المدعومة
    const validStates = [
      'Baden-Württemberg',
      'Bayern',
      'Berlin',
      'Brandenburg',
      'Bremen',
      'Hamburg',
      'Hessen',
      'Mecklenburg-Vorpommern',
      'Niedersachsen',
      'Nordrhein-Westfalen',
      'Rheinland-Pfalz',
      'Saarland',
      'Sachsen',
      'Sachsen-Anhalt',
      'Schleswig-Holstein',
      'Thüringen',
      'NRW',
    ];

    // التحقق من القسم الأول (الولاية)
    if (firstSection.quota !== 3) {
      throw new BadRequestException(
        `First section must have quota = 3 (State questions). Found: ${firstSection.quota}`,
      );
    }

    if (!firstSection.tags || firstSection.tags.length === 0) {
      throw new BadRequestException(
        'First section must have tags with state name (e.g., ["Bayern"])',
      );
    }

    const stateTag = firstSection.tags.find((tag) => validStates.includes(tag));
    if (!stateTag) {
      throw new BadRequestException(
        `First section must have a valid German state in tags. Valid states: ${validStates.join(', ')}`,
      );
    }

    // التحقق من القسم الثاني (الـ300)
    if (secondSection.quota !== 30) {
      throw new BadRequestException(
        `Second section must have quota = 30 (300 Fragen pool). Found: ${secondSection.quota}`,
      );
    }

    if (!secondSection.tags || !secondSection.tags.includes('300-Fragen')) {
      throw new BadRequestException('Second section must have tags: ["300-Fragen"]');
    }

    // التحقق من اسم القسم الثاني
    if (secondSection.name !== '300 Fragen Pool') {
      throw new BadRequestException(
        `Second section name must be "300 Fragen Pool". Found: "${secondSection.name}"`,
      );
    }
  }

  async createExam(dto: CreateExamDto, user: ReqUser) {
    this.assertTeacherOrAdmin(user);

    // التحقق من examCategory
    if (!dto.examCategory) {
      throw new BadRequestException('examCategory is required');
    }

    // ======  👇 ضمان إن الحقول تكون إجبارية فقط لو الامتحان Grammar أو Grammatik-Training  ======
    if (dto.examCategory === ExamCategoryEnum.GRAMMAR || dto.examCategory === ExamCategoryEnum.GRAMMATIK_TRAINING) {
      if (!dto.grammarLevel) {
        throw new BadRequestException('Grammar / Grammatik-Training exams require grammarLevel');
      }
      if (!dto.grammarTopicId) {
        throw new BadRequestException('Grammar / Grammatik-Training exams require grammarTopicId');
      }
      if (!dto.totalQuestions) {
        throw new BadRequestException('Grammar / Grammatik-Training exams require totalQuestions');
      }
    }

    // تنظيف sections من null/undefined قبل التحقق
    // sections الآن اختياري - إذا لم يكن موجوداً، نستخدم array فارغ
    if (!dto.sections || !Array.isArray(dto.sections)) {
      dto.sections = [];
    }

    // إزالة null/undefined sections
    const cleanedSections = dto.sections.filter((s: any) => s !== null && s !== undefined);

    // sections أصبحت اختيارية لجميع أنواع الامتحانات
    // يمكن إضافة الأقسام لاحقاً عبر POST /exams/:examId/sections

    // تحققات إضافية على مستوى الخدمة
    for (const s of cleanedSections) {
      if (!s || typeof s !== 'object') {
        throw new BadRequestException('Each section must be a valid object');
      }

      // التحقق من وجود name (الحقل الأساسي)
      if (!s.name) {
        throw new BadRequestException('Each section must have a name');
      }

      // التحقق حسب examCategory
      if (dto.examCategory === 'provider_exam') {
        // للـ Provider exams: يجب أن يكون هناك quota (بدون items)
        if (!s.quota || typeof s.quota !== 'number' || s.quota <= 0) {
          throw new BadRequestException(
            `Section "${s.name || 'unnamed'}" must have quota for provider_exam`,
          );
        }
        // لا نتحقق من difficultyDistribution لامتحانات Provider (اختياري)
      } else if (dto.examCategory === 'grammar_exam' || dto.examCategory === 'grammatik_training_exam') {
        // للـ Grammar / Grammatik-Training: إذا كان هناك section، يجب أن يكون هناك items (بدون quota)
        // لكن Grammar exams يمكن أن تكون بدون sections تماماً
        if (s.items && Array.isArray(s.items) && s.items.length > 0) {
          // تنظيف items من null
          s.items = s.items.filter(
            (item: any) => item !== null && item !== undefined && item.questionId,
          );
          if (s.items.length === 0) {
            throw new BadRequestException(
              `Section "${s.name || 'unnamed'}" must have at least one valid item with questionId`,
            );
          }
        }
        // التحقق من difficultyDistribution للقواعد فقط (إذا كان موجوداً وquota موجود)
        if (s.quota && s.difficultyDistribution) {
          const { easy = 0, medium = 0, hard = 0 } = s.difficultyDistribution;
          const total = easy + medium + hard;
          if (total !== s.quota) {
            throw new BadRequestException(
              `Section "${s.name || 'unnamed'}" difficultyDistribution must sum to quota`,
            );
          }
        }
      }

      // للتوافق مع الكود القديم: تنظيف items إذا كانت موجودة
      if (s.items && Array.isArray(s.items)) {
        s.items = s.items.filter(
          (item: any) => item !== null && item !== undefined && item.questionId,
        );
      }
    }

    // استبدال sections بالنسخة المنظفة
    dto.sections = cleanedSections;

    // Validation خاص لـ "Deutschland-in-Leben" Test
    if (dto.provider === 'Deutschland-in-Leben') {
      this.validateDeutschlandInLebenStructure(dto);
    }

    const userId = user.userId || (user as any).sub || (user as any).id;

    // تحويل questionId في items إلى ObjectId إذا كان string
    // معالجة attemptsLimit و attemptLimit (دعم كلا الحقلين)
    const processedDto: any = { ...dto };
    if (processedDto.attemptsLimit !== undefined) {
      processedDto.attemptLimit = processedDto.attemptsLimit; // تحويل attemptsLimit إلى attemptLimit للـ schema
    }

    // تنظيف sections: تحويل med إلى medium و skill إلى lowercase
    if (processedDto.sections && Array.isArray(processedDto.sections)) {
      // إزالة null/undefined sections
      processedDto.sections = processedDto.sections
        .filter((section: any) => section !== null && section !== undefined)
        .map((section: any) => {
          // إنشاء نسخة جديدة من section لتجنب تعديل الـ original
          const processedSection = { ...section };

          // توحيد الحقول: name هو الحقل الموحد (name = name ?? title)
          processedSection.name = processedSection.name ?? processedSection.title;
          // نسخ name إلى title للتوافق
          if (processedSection.name && !processedSection.title) {
            processedSection.title = processedSection.name;
          }

          // تحويل skill إلى lowercase
          if (processedSection.skill && typeof processedSection.skill === 'string') {
            processedSection.skill = processedSection.skill.toLowerCase();
          }

          // تحويل med إلى medium في difficultyDistribution
          if (
            processedSection.difficultyDistribution &&
            processedSection.difficultyDistribution.med !== undefined
          ) {
            processedSection.difficultyDistribution.medium =
              processedSection.difficultyDistribution.med;
            delete processedSection.difficultyDistribution.med;
          }

          // معالجة listeningAudioId - تحويل string إلى ObjectId إذا كان موجوداً
          if (processedSection.listeningAudioId) {
            if (
              typeof processedSection.listeningAudioId === 'string' &&
              Types.ObjectId.isValid(processedSection.listeningAudioId)
            ) {
              processedSection.listeningAudioId = new Types.ObjectId(
                processedSection.listeningAudioId,
              );
            } else if (!(processedSection.listeningAudioId instanceof Types.ObjectId)) {
              // إذا كان غير صالح، نحذفه
              delete processedSection.listeningAudioId;
            }
          }

          // معالجة items - يمكن أن تكون فارغة أو undefined
          const sectionItems = processedSection.items ?? [];
          if (Array.isArray(sectionItems) && sectionItems.length > 0) {
            // إزالة null/undefined items وتحويل questionId إلى ObjectId
            const validItems = sectionItems
              .filter((item: any) => {
                // إزالة items بدون questionId
                if (!item || item === null || item === undefined || !item.questionId) {
                  return false;
                }
                // التحقق من أن questionId صالح
                try {
                  // محاولة تحويل questionId إلى ObjectId للتحقق من صحته
                  if (item.questionId instanceof Types.ObjectId) {
                    return true;
                  }
                  // التحقق من أن questionId string صالح
                  if (
                    typeof item.questionId === 'string' &&
                    Types.ObjectId.isValid(item.questionId)
                  ) {
                    return true;
                  }
                  this.logger.warn(
                    `[createExam] Invalid questionId: ${item.questionId} - skipping item`,
                  );
                  return false;
                } catch (error) {
                  this.logger.warn(
                    `[createExam] Error validating questionId ${item.questionId}: ${error.message} - skipping item`,
                  );
                  return false;
                }
              })
              .map((item: any) => {
                // تحويل questionId إلى ObjectId
                return {
                  ...item,
                  questionId:
                    item.questionId instanceof Types.ObjectId
                      ? item.questionId
                      : new Types.ObjectId(item.questionId),
                };
              });

            processedSection.items = validItems;
          } else {
            // items فارغة أو undefined - هذا مسموح الآن
            processedSection.items = [];
          }

          return processedSection;
        });

      // sections اختيارية - يمكن أن تكون فارغة
    }

    // Ensure sections is always an array (never null or undefined)
    const normalizedSections = Array.isArray(processedDto.sections)
      ? processedDto.sections.filter((s: any) => s !== null && s !== undefined)
      : (processedDto.sections ?? []);

    // Log sections before creation
    this.logger.log(
      `[createExam] Creating exam - title: ${dto.title}, sections count: ${normalizedSections.length}, sections with items: ${normalizedSections.filter((s: any) => Array.isArray(s.items) && s.items.length > 0).length}`,
    );

    // Log detailed section info before saving
    normalizedSections.forEach((s: any, index: number) => {
      this.logger.log(
        `[createExam] Section ${index + 1}: name="${s?.name || s?.title || 'unnamed'}", items count=${s?.items?.length || 0}, items=${JSON.stringify(s?.items?.map((i: any) => ({ questionId: String(i?.questionId), points: i?.points })) || [])}`,
      );
    });

    // Normalize provider before saving
    if (processedDto.provider) {
      processedDto.provider = normalizeProvider(processedDto.provider) || processedDto.provider;
    }

    const doc = await this.model.create({
      ...processedDto,
      sections: normalizedSections, // Explicitly set sections to ensure no null values
      status: processedDto.status ?? ExamStatusEnum.DRAFT,
      ownerId: new Types.ObjectId(userId),
      version: 1, // Exam versioning: يبدأ من version 1
    });

    // Log sections after creation
    this.logger.log(
      `[createExam] Exam created - id: ${doc._id}, sections count: ${doc.sections?.length || 0}, sections: ${JSON.stringify(doc.sections?.map((s: any) => ({ name: s?.name, itemsCount: s?.items?.length || 0, hasItems: Array.isArray(s?.items) && s.items.length > 0, quota: s?.quota })))}`,
    );

    return {
      id: doc._id,
      title: doc.title,
      level: doc.level,
      status: doc.status,
      sections: doc.sections,
      randomizeQuestions: doc.randomizeQuestions,
      attemptLimit: doc.attemptLimit,
      ownerId: doc.ownerId,
      createdAt: (doc as any).createdAt,
    };
  }

  /**
   * إنشاء Exam ديناميكي للطلاب (للتمارين)
   * - يسمح للطلاب بإنشاء Exam للتمارين فقط
   * - status: published تلقائياً
   * - بدون validation معقد
   */
  async createPracticeExam(dto: CreatePracticeExamDto, user: ReqUser) {
    // التحقق من أن sections تحتوي على items (أسئلة محددة)
    if (!dto.sections || !Array.isArray(dto.sections) || dto.sections.length === 0) {
      throw new BadRequestException('At least one section with items is required');
    }

    // تنظيف sections من null/undefined
    const cleanedSections = dto.sections.filter((s: any) => s !== null && s !== undefined);
    if (cleanedSections.length === 0) {
      throw new BadRequestException(
        'At least one valid section is required (null sections are not allowed)',
      );
    }

    for (const s of cleanedSections) {
      if (!s || typeof s !== 'object') {
        throw new BadRequestException('Each section must be a valid object');
      }

      // تنظيف items من null و items بدون questionId
      if (s.items && Array.isArray(s.items)) {
        s.items = s.items.filter(
          (item: any) =>
            item !== null && item !== undefined && item.questionId && item.questionId !== null,
        );
      }

      if (!s.items || !Array.isArray(s.items) || s.items.length === 0) {
        throw new BadRequestException(
          `Section "${s.name || 'unnamed'}" must have at least one valid item with questionId`,
        );
      }

      // لا نسمح بـ quota للطلاب (فقط items)
      if (s.quota) {
        throw new BadRequestException(
          'Students cannot create exams with quota. Use items instead.',
        );
      }
    }

    // استبدال sections بالنسخة المنظفة
    dto.sections = cleanedSections;

    // إضافة title تلقائياً إذا كان مفقوداً
    const title = dto.title || `Practice Exam - ${new Date().toLocaleDateString()}`;

    const userId = user.userId || (user as any).sub || (user as any).id;

    // تنظيف sections من null/undefined
    const processedDto = { ...dto };
    if (processedDto.sections && Array.isArray(processedDto.sections)) {
      processedDto.sections = processedDto.sections
        .filter((section: any) => section !== null && section !== undefined)
        .map((section: any) => {
          if (section.items && Array.isArray(section.items)) {
            section.items = section.items
              .filter((item: any) => item !== null && item !== undefined)
              .map((item: any) => {
                if (item.questionId) {
                  return {
                    ...item,
                    questionId:
                      item.questionId instanceof Types.ObjectId
                        ? item.questionId
                        : new Types.ObjectId(item.questionId),
                  };
                }
                return item;
              });
          }
          return section;
        });

      if (processedDto.sections.length === 0) {
        throw new BadRequestException('Exam must have at least one valid section');
      }
    }

    // Ensure sections is always an array (never null, undefined, or empty objects)
    const normalizedSections = Array.isArray(processedDto.sections)
      ? processedDto.sections.filter((s: any) => {
          // Remove null or undefined
          if (s === null || s === undefined) {
            return false;
          }
          // Remove empty objects {} (objects with no keys or only undefined/null values)
          if (typeof s === 'object' && !Array.isArray(s)) {
            const keys = Object.keys(s);
            // If object has no keys, it's empty {}
            if (keys.length === 0) {
              return false;
            }
            // Check if object has any meaningful values (not all undefined/null)
            const hasValidValue = keys.some((key) => {
              const value = s[key];
              return value !== null && value !== undefined && value !== '';
            });
            return hasValidValue;
          }
          return true;
        })
      : [];

    this.logger.log(
      `[createPracticeExam] Creating exam - title: ${title}, sections count: ${normalizedSections.length}, sections: ${JSON.stringify(normalizedSections.map((s: any) => ({ name: s.name, itemsCount: s.items?.length || 0 })))}`,
    );

    const doc = await this.model.create({
      ...processedDto,
      title,
      sections: normalizedSections, // Explicitly set sections to ensure no null values
      status: ExamStatusEnum.PUBLISHED, // دائماً published للطلاب
      ownerId: new Types.ObjectId(userId),
      version: 1, // Exam versioning: يبدأ من version 1
    });

    this.logger.log(
      `[createPracticeExam] Exam created - id: ${doc._id}, sections count: ${doc.sections?.length || 0}, sections: ${JSON.stringify(doc.sections?.map((s: any) => ({ name: s?.name, itemsCount: s?.items?.length || 0, hasItems: Array.isArray(s?.items) && s.items.length > 0 })))}`,
    );

    return {
      id: String(doc._id),
      title: doc.title,
      level: doc.level,
      status: doc.status,
      sections: doc.sections,
      randomizeQuestions: doc.randomizeQuestions,
      attemptLimit: doc.attemptLimit,
      ownerId: doc.ownerId,
      createdAt: (doc as any).createdAt,
    };
  }

  /**
   * إنشاء Practice Exam للطلاب (Learn Mode)
   * - general: 300 سؤال عام
   * - state: 160 سؤال ولادي (10 لكل ولاية)
   * - يرجع الأسئلة مع الإجابات الصحيحة والشرح
   */
  async createPracticeModeExam(dto: CreatePracticeModeDto, user: ReqUser) {
    this.logger.log(
      `[createPracticeModeExam] Request - mode: ${dto.mode}, state: ${dto.state}, userId: ${user.userId}, role: ${user.role}`,
    );

    // التحقق من state إذا كان mode=state
    if (dto.mode === PracticeMode.STATE && !dto.state) {
      throw new BadRequestException('State is required when mode=state');
    }

    const query: any = {
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test',
      status: QuestionStatus.PUBLISHED,
    };

    if (dto.mode === PracticeMode.GENERAL) {
      // الأسئلة العامة (300 سؤال) - فقط الأسئلة بدون state
      // ✅ فصل واضح: general = بدون state تماماً
      query.$and = [
        {
          $or: [{ state: { $exists: false } }, { state: null }, { state: '' }],
        },
        {
          $or: [
            { category: 'general' },
            { usageCategory: 'common' },
            {
              category: { $exists: false },
              usageCategory: { $exists: false },
            },
          ],
        },
      ];
    } else if (dto.mode === PracticeMode.STATE) {
      // أسئلة الولاية (160 سؤال - 10 لكل ولاية) - فقط الأسئلة مع state
      // ✅ فصل واضح: state = مع state field محدد
      query.state = dto.state;
      query.$or = [
        { category: 'state' },
        { usageCategory: 'state_specific' },
        {
          category: { $exists: false },
          usageCategory: { $exists: false },
        },
      ];
    }

    this.logger.log(`[createPracticeModeExam] Query: ${JSON.stringify(query)}`);

    // جلب جميع الأسئلة
    const questions = await this.questionModel.find(query).sort({ createdAt: 1 }).lean().exec();

    this.logger.log(
      `[createPracticeModeExam] Found ${questions.length} questions for mode=${dto.mode}${dto.state ? `, state=${dto.state}` : ''} (expected: ${dto.mode === PracticeMode.GENERAL ? '300' : '10'})`,
    );

    if (questions.length === 0) {
      throw new NotFoundException(
        `No questions found for mode=${dto.mode}${dto.state ? `, state=${dto.state}` : ''}`,
      );
    }

    // معالجة الأسئلة لإرجاع الإجابات الصحيحة
    const processedQuestions = questions.map((item: any) => {
      let correctAnswer = item.correctAnswer;
      let correctOptionId: string | undefined;

      // استخراج correctAnswer من options إذا لم يكن موجوداً
      if (item.qType === QuestionType.MCQ && item.options) {
        const correctOption = item.options.find((opt: any) => opt.isCorrect === true);
        if (correctOption) {
          correctAnswer = correctOption.text;
          correctOptionId = correctOption._id?.toString() || correctOption.id;
        }
      }

      return {
        id: item._id.toString(),
        prompt: item.prompt || item.text,
        qType: item.qType,
        options: item.options || [],
        correctAnswer,
        correctOptionId,
        explanation: item.explanation,
        media: item.media,
        images: item.images || [],
        level: item.level,
        tags: item.tags || [],
        usageCategory: item.usageCategory,
        state: item.state,
      };
    });

    return {
      mode: dto.mode,
      state: dto.state,
      totalQuestions: questions.length,
      questions: processedQuestions,
    };
  }

  async findAll(user: ReqUser, q: QueryExamDto) {
    const filter: any = {};

    // الطالب: يشوف فقط الامتحانات المنشورة
    if (user.role === 'student') {
      filter.status = ExamStatusEnum.PUBLISHED;

      // فلترة حسب assignedStudentIds (غير مخصص أو مخصص له)
      const userId = user.userId || (user as any).sub || (user as any).id;
      const studentId = new Types.ObjectId(userId);
      filter.$or = [
        { assignedStudentIds: { $exists: false } },
        { assignedStudentIds: { $size: 0 } },
        { assignedStudentIds: studentId },
      ];
    }
    // المدرس: يشوف امتحاناته فقط
    else if (user.role === 'teacher') {
      const userId = user.userId || (user as any).sub || (user as any).id;
      filter.ownerId = new Types.ObjectId(userId);
      if (q?.status) filter.status = q.status;
    }
    // الأدمن: يشوف الكل (يمكنه الفلترة حسب status)
    else if (user.role === 'admin') {
      if (q?.status) filter.status = q.status;
    }

    // فلترة مشتركة
    if (q?.level) filter.level = q.level;
    if (q?.provider) {
      // استخدام regex للبحث case-insensitive (لأن provider قد يكون "Goethe" أو "goethe" أو "GOETHE")
      const escapedProvider = q.provider.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.provider = { $regex: `^${escapedProvider}$`, $options: 'i' };
    }
    if (q?.examCategory) filter.examCategory = q.examCategory;
    if (q?.mainSkill) filter.mainSkill = q.mainSkill;

    // فلترة حسب state (الولاية) - البحث في sections.tags
    // يجب أن يكون هناك قسم واحد على الأقل يحتوي على الولاية المطلوبة
    if (q?.state) {
      // البحث عن امتحانات تحتوي على قسم واحد على الأقل مع tags تحتوي على الولاية
      filter['sections.tags'] = { $in: [q.state] };
      this.logger.debug(`Filtering exams by state: ${q.state}`);
    }

    const items = await this.model.find(filter).sort({ createdAt: -1 }).lean().exec();

    // للطلاب: فلترة حسب attemptLimit
    if (user.role === 'student') {
      const userId = user.userId || (user as any).sub || (user as any).id;
      const studentId = new Types.ObjectId(userId);
      const examIds = items.map((e: any) => e._id);

      if (examIds.length > 0) {
        const attemptCounts = await this.model.db
          .collection('attempts')
          .aggregate([
            {
              $match: {
                studentId,
                examId: { $in: examIds },
              },
            },
            {
              $group: {
                _id: '$examId',
                count: { $sum: 1 },
              },
            },
          ])
          .toArray();

        const attemptCountMap = new Map(attemptCounts.map((a: any) => [a._id.toString(), a.count]));

        const availableExams: any[] = [];
        for (const exam of items) {
          const attemptCount = attemptCountMap.get(exam._id.toString()) || 0;
          const attemptLimit = exam.attemptLimit || 0;
          if (attemptLimit === 0 || attemptCount < attemptLimit) {
            availableExams.push(exam);
          }
        }
        return { items: availableExams, count: availableExams.length };
      }
    }

    return { items, count: items.length };
  }

  /**
   * جلب قائمة مبسطة من الامتحانات
   * يرجع فقط: _id, title, level
   */
  async findAllSimple(user: ReqUser, q: QueryExamDto) {
    const filter: any = {};

    // الطالب: يشوف فقط الامتحانات المنشورة
    if (user.role === 'student') {
      filter.status = ExamStatusEnum.PUBLISHED;

      // فلترة حسب assignedStudentIds (غير مخصص أو مخصص له)
      const userId = user.userId || (user as any).sub || (user as any).id;
      const studentId = new Types.ObjectId(userId);
      filter.$or = [
        { assignedStudentIds: { $exists: false } },
        { assignedStudentIds: { $size: 0 } },
        { assignedStudentIds: studentId },
      ];
    }
    // المدرس: يشوف امتحاناته فقط
    else if (user.role === 'teacher') {
      const userId = user.userId || (user as any).sub || (user as any).id;
      filter.ownerId = new Types.ObjectId(userId);
      if (q?.status) filter.status = q.status;
    }
    // الأدمن: يشوف الكل (يمكنه الفلترة حسب status)
    else if (user.role === 'admin') {
      if (q?.status) filter.status = q.status;
    }

    // فلترة مشتركة
    if (q?.level) filter.level = q.level;
    if (q?.provider) {
      // استخدام regex للبحث case-insensitive (لأن provider قد يكون "Goethe" أو "goethe" أو "GOETHE")
      const escapedProvider = q.provider.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.provider = { $regex: `^${escapedProvider}$`, $options: 'i' };
    }

    // فلترة حسب state (الولاية) - البحث في sections.tags
    if (q?.state) {
      filter['sections.tags'] = { $in: [q.state] };
    }

    const items = await this.model
      .find(filter)
      .select('_id title level')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    // تحويل _id إلى string للتوافق
    const simplifiedItems = items.map((exam: any) => ({
      _id: exam._id.toString(),
      title: exam.title,
      level: exam.level,
    }));

    return simplifiedItems;
  }

  async findAvailableForStudent(user: ReqUser, q: QueryExamDto) {
    if (!user || user.role !== 'student') {
      throw new ForbiddenException('Only students can access available exams');
    }

    const userId = user.userId || (user as any).sub || (user as any).id;
    const studentId = new Types.ObjectId(userId);

    const filter: any = {
      status: ExamStatusEnum.PUBLISHED,
      $or: [
        { assignedStudentIds: { $exists: false } }, // غير مخصص لأحد
        { assignedStudentIds: { $size: 0 } }, // قائمة فارغة
        { assignedStudentIds: studentId }, // مخصص لهذا الطالب
      ],
    };

    // فلترة حسب examCategory - يشمل grammar_exam و leben_exam
    if (q?.examCategory) {
      filter.examCategory = q.examCategory;
    } else {
      // إذا لم يتم تحديد examCategory، نعرض grammar_exam و leben_exam
      filter.examCategory = { $in: ['grammar_exam', 'leben_exam'] };
    }

    if (q?.level) filter.level = q.level;
    if (q?.provider) {
      // استخدام regex للبحث case-insensitive (لأن provider قد يكون "Goethe" أو "goethe" أو "GOETHE")
      const escapedProvider = q.provider.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.provider = { $regex: `^${escapedProvider}$`, $options: 'i' };
    }
    if (q?.mainSkill) filter.mainSkill = q.mainSkill;

    const items = await this.model.find(filter).sort({ createdAt: -1 }).lean().exec();

    // فلترة حسب attemptLimit
    const availableExams: any[] = [];
    const examIds = items.map((e: any) => e._id);

    if (examIds.length > 0) {
      const attemptCounts = await this.model.db
        .collection('attempts')
        .aggregate([
          {
            $match: {
              studentId,
              examId: { $in: examIds },
            },
          },
          {
            $group: {
              _id: '$examId',
              count: { $sum: 1 },
            },
          },
        ])
        .toArray();

      const attemptCountMap = new Map(attemptCounts.map((a: any) => [a._id.toString(), a.count]));

      for (const exam of items) {
        const attemptCount = attemptCountMap.get(exam._id.toString()) || 0;
        const attemptLimit = exam.attemptLimit || 0;
        if (attemptLimit === 0 || attemptCount < attemptLimit) {
          availableExams.push(exam);
        }
      }
    } else {
      availableExams.push(...items);
    }

    return { items: availableExams, count: availableExams.length };
  }

  /**
   * جلب قائمة امتحانات Leben in Deutschland المتاحة
   */
  async getAvailableLebenExams() {
    return this.model
      .find({
        status: ExamStatusEnum.PUBLISHED,
        examCategory: 'leben_exam',
        examType: 'leben_test',
        provider: 'leben_in_deutschland',
        mainSkill: 'leben_test',
      })
      .select('_id title timeLimitMin level')
      .lean()
      .exec();
  }

  /**
   * عرض قائمة الامتحانات المنشورة للطلاب (Public endpoint)
   * - يعرض فقط الامتحانات المنشورة (status = published)
   * - يفلتر حسب level و provider إذا تم إرسالهما
   * - Response: id, title, level, provider, timeLimitMin, sections[]
   */
  async findPublicExams(q: QueryExamDto) {
    try {
      this.logger.log(`[findPublicExams] Starting - level: ${q?.level}, provider: ${q?.provider}`);

      const filter: any = {
        status: ExamStatusEnum.PUBLISHED,
      };

      // فلترة حسب level و provider
      if (q?.level) {
        filter.level = q.level;
        this.logger.debug(`[findPublicExams] Filter by level: ${q.level}`);
      }
      if (q?.provider) {
        // استخدام regex للبحث case-insensitive (لأن provider قد يكون "telc" أو "Telc" أو "TELC")
        // استخدام string pattern بدلاً من RegExp object لـ MongoDB
        const escapedProvider = q.provider.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.provider = { $regex: `^${escapedProvider}$`, $options: 'i' };
        this.logger.debug(`[findPublicExams] Filter by provider (case-insensitive): ${q.provider}`);
      }
      if (q?.examCategory) {
        filter.examCategory = q.examCategory;
        this.logger.debug(`[findPublicExams] Filter by examCategory: ${q.examCategory}`);
      }
      if (q?.mainSkill) {
        filter.mainSkill = q.mainSkill;
        this.logger.debug(`[findPublicExams] Filter by mainSkill: ${q.mainSkill}`);
      }

      this.logger.debug(`[findPublicExams] Filter: ${JSON.stringify(filter)}`);

      // Pagination (إذا كان موجوداً)
      const page = (q as any)?.page ? parseInt((q as any).page, 10) : 1;
      const limit = (q as any)?.limit ? parseInt((q as any).limit, 10) : undefined;

      // التحقق من أن page و limit صحيحين
      const skip = limit ? (page - 1) * limit : 0;
      if (skip < 0) {
        this.logger.warn(
          `[findPublicExams] Invalid pagination - page: ${page}, limit: ${limit}, skip: ${skip}`,
        );
      }

      this.logger.debug(
        `[findPublicExams] Querying database with filter: ${JSON.stringify(filter)}`,
      );
      const query = this.model.find(filter).sort({ createdAt: -1 });

      if (limit) {
        query.skip(skip).limit(limit);
        this.logger.debug(`[findPublicExams] Pagination - skip: ${skip}, limit: ${limit}`);
      }

      const items = await query.lean().exec();
      this.logger.log(`[findPublicExams] Found ${items?.length || 0} exams`);

      // التحقق من أن items موجودة
      if (!items || !Array.isArray(items)) {
        this.logger.warn(`[findPublicExams] No exams found or items is not an array`);
        return { items: [], count: 0 };
      }

      // جلب أسماء مواضيع القواعد لامتحانات Grammatik-Training (لإظهار اسم الموضوع بدل اسم الامتحان)
      const grammatikTopicIds = items
        .filter((e: any) => e.examCategory === 'grammatik_training_exam' && e.grammarTopicId)
        .map((e: any) => e.grammarTopicId);
      let topicTitleMap = new Map<string, string>();
      if (grammatikTopicIds.length > 0) {
        const topics = await this.grammarTopicModel
          .find({ _id: { $in: grammatikTopicIds } })
          .select('_id title')
          .lean()
          .exec();
        topics.forEach((t: any) => {
          if (t._id && t.title) topicTitleMap.set(t._id.toString(), t.title);
        });
      }

      // تحويل البيانات إلى الصيغة المطلوبة
      const publicExams = items
        .map((exam: any) => {
          try {
            // التحقق من أن exam موجود
            if (!exam) {
              this.logger.warn(`[findPublicExams] Exam is null or undefined`);
              return null;
            }

            // التحقق من أن sections موجودة وليست فارغة
            // استثناء: امتحانات الكتابة تستخدم schreibenTaskId بدل sections
            const isSchreibenExam = (exam as any).mainSkill === 'schreiben' && exam.schreibenTaskId;
            // استثناء: Lesen & Hören و Dialoge و Grammatik-Training يسمح لهم بدون أقسام
            const isLesenHoerenOrDialoge = (exam as any).examCategory === 'lesen_hoeren_exam' || (exam as any).examCategory === 'dialoge_exam';
            const isGrammatikTraining = (exam as any).examCategory === 'grammatik_training_exam';
            const hasNoSections = !Array.isArray(exam.sections) || exam.sections.length === 0;
            if (!isSchreibenExam && !isLesenHoerenOrDialoge && !isGrammatikTraining && hasNoSections) {
              this.logger.warn(`[findPublicExams] Exam ${exam._id} has no sections - skipping`);
              return null;
            }

            // امتحانات الكتابة: إرجاعها مع section خاص للكتابة
            if (isSchreibenExam) {
              return {
                id: exam._id?.toString() || '',
                title: exam.title || '',
                level: exam.level || undefined,
                provider: exam.provider || undefined,
                timeLimitMin: exam.timeLimitMin || 0,
                mainSkill: 'schreiben',
                schreibenTaskId: exam.schreibenTaskId?.toString() || '',
                sections: [
                  {
                    skill: 'schreiben',
                    label: 'Schreiben',
                    partsCount: 1,
                  },
                ],
              };
            }

            // Lesen & Hören / Dialoge / Grammatik-Training بدون أقسام: إرجاعها مع sections فارغة أو placeholder
            if ((isLesenHoerenOrDialoge || isGrammatikTraining) && hasNoSections) {
              const displayTitle = isGrammatikTraining && exam.grammarTopicId
                ? (topicTitleMap.get(exam.grammarTopicId.toString()) || exam.title || '')
                : (exam.title || '');
              return {
                id: exam._id?.toString() || '',
                title: displayTitle,
                level: exam.level || undefined,
                provider: exam.provider || undefined,
                mainSkill: (exam as any).mainSkill || undefined,
                timeLimitMin: exam.timeLimitMin || 0,
                sections: [],
              };
            }

            // التحقق من أن sections تحتوي على sections صحيحة (ليست null)
            const sectionsList = Array.isArray(exam.sections) ? exam.sections : [];
            const validSections = sectionsList.filter((s: any) => {
              if (!s || s === null) return false;
              const hasItems = Array.isArray(s.items) && s.items.length > 0;
              const hasQuota = typeof s.quota === 'number' && s.quota > 0;
              return hasItems || hasQuota;
            });

            if (validSections.length === 0) {
              this.logger.warn(
                `[findPublicExams] Exam ${exam._id} has no valid sections (all null or empty) - skipping`,
              );
              return null;
            }

            const sections = validSections
              .map((s: any) => {
                // حساب partsCount من items أو quota
                let partsCount = 0;
                if (Array.isArray(s.items) && s.items.length > 0) {
                  partsCount = s.items.length;
                } else if (typeof s.quota === 'number' && s.quota > 0) {
                  partsCount = s.quota;
                }

                // استخدام partsCount من الحقل إذا كان موجوداً، وإلا استخدم المحسوب
                const finalPartsCount =
                  typeof s.partsCount === 'number' && s.partsCount > 0 ? s.partsCount : partsCount;

                // بناء object مع جميع الحقول المطلوبة
                const sectionObj: any = {
                  skill: s.skill || undefined,
                  label: s.label || s.name || '', // label مطلوب دائماً
                };

                // إضافة durationMin إذا كان موجوداً
                if (typeof s.durationMin === 'number' && s.durationMin > 0) {
                  sectionObj.durationMin = s.durationMin;
                }

                // إضافة partsCount دائماً (حتى لو كان 0)
                sectionObj.partsCount = finalPartsCount;

                return sectionObj;
              })
              .filter((s: any) => s !== null);

            if (sections.length === 0) {
              this.logger.warn(
                `[findPublicExams] Exam ${exam._id} has no valid sections after mapping - skipping`,
              );
              return null;
            }

            const displayTitle = isGrammatikTraining && exam.grammarTopicId
              ? (topicTitleMap.get(exam.grammarTopicId.toString()) || exam.title || '')
              : (exam.title || '');
            return {
              id: exam._id?.toString() || '',
              title: displayTitle,
              level: exam.level || undefined,
              provider: exam.provider || undefined,
              mainSkill: (exam as any).mainSkill || undefined,
              timeLimitMin: exam.timeLimitMin || 0,
              sections,
            };
          } catch (error: any) {
            this.logger.error(
              `[findPublicExams] Error mapping exam ${exam?._id}: ${error.message}`,
              error.stack,
            );
            return null;
          }
        })
        .filter((exam: any) => exam !== null);

      this.logger.log(`[findPublicExams] Success - returning ${publicExams.length} exams`);
      return { items: publicExams, count: publicExams.length };
    } catch (error: any) {
      this.logger.error(`[findPublicExams] Error: ${error.message}`, error.stack);
      // إرجاع قائمة فارغة بدل رمي 500 حتى لا تظهر الصفحة بيضاء للطالب
      return { items: [], count: 0 };
    }
  }

  /**
   * أسئلة تدريب قواعد للطالب: إما حسب مستوى (كل المواضيع) أو حسب امتحان واحد (موضوع واحد).
   * Public endpoint - لا يحتاج JWT
   */
  async getGrammatikTrainingQuizQuestions(
    count: number,
    options: { level?: string; examId?: string },
  ) {
    if (count < 1 || count > 50) {
      throw new BadRequestException('count بين 1 و 50');
    }
    const { level, examId } = options;
    if (examId) {
      if (!Types.ObjectId.isValid(examId)) {
        throw new BadRequestException('معرف الامتحان غير صالح');
      }
      const exam = await this.model
        .findOne({
          _id: new Types.ObjectId(examId),
          status: ExamStatusEnum.PUBLISHED,
          examCategory: 'grammatik_training_exam',
        })
        .select('sections')
        .lean()
        .exec();
      if (!exam) return [];
      const questionIds: Types.ObjectId[] = [];
      const sections = (exam as any).sections || [];
      for (const sec of sections) {
        const items = sec?.items || [];
        for (const item of items) {
          const qid = item?.questionId;
          if (qid) questionIds.push(qid instanceof Types.ObjectId ? qid : new Types.ObjectId(qid));
        }
      }
      const uniqueIds = [...new Set(questionIds.map((id) => id.toString()))].map((id) => new Types.ObjectId(id));
      if (uniqueIds.length === 0) return [];
      const shuffled = uniqueIds.slice().sort(() => Math.random() - 0.5);
      const take = Math.min(count, shuffled.length);
      const selectedIds = shuffled.slice(0, take);
      const questions = await this.questionModel
        .find({ _id: { $in: selectedIds }, status: QuestionStatus.PUBLISHED })
        .select('prompt qType options answerKeyBoolean fillExact answerKeyMatch answerKeyReorder points')
        .lean()
        .exec();
      const idOrder = new Map(selectedIds.map((id, i) => [id.toString(), i]));
      const sorted = questions
        .filter((q: any) => q != null)
        .sort((a: any, b: any) => (idOrder.get(a._id.toString()) ?? 0) - (idOrder.get(b._id.toString()) ?? 0));
      return sorted.map((q: any) => ({
        _id: q._id?.toString(),
        prompt: q.prompt,
        qType: q.qType,
        options: q.options,
        answerKeyBoolean: q.answerKeyBoolean,
        fillExact: q.fillExact,
        answerKeyMatch: q.answerKeyMatch,
        answerKeyReorder: q.answerKeyReorder,
        points: q.points ?? 1,
      }));
    }
    if (!level) {
      throw new BadRequestException('level أو examId مطلوب');
    }
    const exams = await this.model
      .find({
        status: ExamStatusEnum.PUBLISHED,
        examCategory: 'grammatik_training_exam',
        level,
      })
      .select('sections')
      .lean()
      .exec();

    const questionIds: Types.ObjectId[] = [];
    for (const exam of exams) {
      const sections = (exam as any).sections || [];
      for (const sec of sections) {
        const items = sec?.items || [];
        for (const item of items) {
          const qid = item?.questionId;
          if (qid) questionIds.push(qid instanceof Types.ObjectId ? qid : new Types.ObjectId(qid));
        }
      }
    }

    const uniqueIds = [...new Set(questionIds.map((id) => id.toString()))].map((id) => new Types.ObjectId(id));
    if (uniqueIds.length === 0) {
      return [];
    }

    const shuffled = uniqueIds.slice().sort(() => Math.random() - 0.5);
    const take = Math.min(count, shuffled.length);
    const selectedIds = shuffled.slice(0, take);

    const questions = await this.questionModel
      .find({ _id: { $in: selectedIds }, status: QuestionStatus.PUBLISHED })
      .select(
        'prompt qType options answerKeyBoolean fillExact answerKeyMatch answerKeyReorder points',
      )
      .lean()
      .exec();

    const idOrder = new Map(selectedIds.map((id, i) => [id.toString(), i]));
    const sorted = questions
      .filter((q: any) => q != null)
      .sort((a: any, b: any) => (idOrder.get(a._id.toString()) ?? 0) - (idOrder.get(b._id.toString()) ?? 0));

    return sorted.map((q: any) => ({
      _id: q._id?.toString(),
      prompt: q.prompt,
      qType: q.qType,
      options: q.options,
      answerKeyBoolean: q.answerKeyBoolean,
      fillExact: q.fillExact,
      answerKeyMatch: q.answerKeyMatch,
      answerKeyReorder: q.answerKeyReorder,
      points: q.points ?? 1,
    }));
  }

  /**
   * عرض تفاصيل امتحان معين للطالب (Public endpoint)
   * - يعرض بيانات الامتحان المتاحة للطالب
   * - Response: id, title, description, level, provider, timeLimitMin, attemptLimit, sections[]
   * - لا يعرض الأسئلة نفسها، فقط هيكل الأقسام
   */
  async findPublicExamById(examId: string) {
    if (!Types.ObjectId.isValid(examId)) {
      throw new BadRequestException(
        `Invalid exam ID format: ${examId}. Expected a valid MongoDB ObjectId (24 hex characters)`,
      );
    }
    const doc = await this.model.findById(examId).lean().exec();
    if (!doc) throw new NotFoundException('Exam not found');

    // التحقق من أن الامتحان منشور
    if (doc.status !== ExamStatusEnum.PUBLISHED) {
      throw new NotFoundException('Exam not found');
    }

    // امتحانات الكتابة: إرجاعها مع بيانات خاصة + الأسئلة العادية لو موجودة
    const isSchreibenExam = (doc as any).mainSkill === 'schreiben' && (doc as any).schreibenTaskId;
    if (isSchreibenExam) {
      // بناء sections: Schreiben أولاً + أي أسئلة عادية بعده
      const resultSections: any[] = [
        {
          skill: 'schreiben',
          label: 'Schreiben',
          partsCount: 1,
        },
      ];

      // إضافة الأقسام العادية لو موجودة (أسئلة بعد مهمة الكتابة)
      if (Array.isArray(doc.sections) && doc.sections.length > 0) {
        const regularSections = doc.sections.filter((s: any) => {
          if (!s || s === null) return false;
          const hasItems = Array.isArray(s.items) && s.items.length > 0;
          const hasQuota = typeof s.quota === 'number' && s.quota > 0;
          return hasItems || hasQuota;
        });
        for (const s of regularSections) {
          let partsCount = 0;
          if (Array.isArray(s.items) && s.items.length > 0) {
            partsCount = s.items.length;
          } else if (typeof s.quota === 'number' && s.quota > 0) {
            partsCount = s.quota;
          }
          resultSections.push({
            skill: s.skill,
            label: s.label || s.name || s.title,
            durationMin: s.durationMin,
            partsCount: s.partsCount || partsCount,
          });
        }
      }

      return {
        id: doc._id.toString(),
        title: doc.title,
        description: (doc as any).description,
        level: doc.level,
        provider: doc.provider,
        timeLimitMin: doc.timeLimitMin,
        attemptLimit: doc.attemptLimit,
        mainSkill: 'schreiben',
        schreibenTaskId: (doc as any).schreibenTaskId?.toString() || '',
        hasQuestions: resultSections.length > 1, // فيه أسئلة بعد المهمة؟
        sections: resultSections,
      };
    }

    // Sections optional: إذا لا يوجد أقسام نرجع امتحاناً مع sections فارغة (امتحان بسيط بدون أقسام)
    const rawSections = Array.isArray(doc.sections) ? doc.sections : [];
    const validSections = rawSections.filter((s: any) => {
      if (!s || s === null) return false;
      const hasItems = Array.isArray(s.items) && s.items.length > 0;
      const hasQuota = typeof s.quota === 'number' && s.quota > 0;
      return hasItems || hasQuota;
    });

    // تحويل الأقسام إلى الصيغة المطلوبة (أو مصفوفة فارغة)
    const sections = validSections.map((s: any) => {
      // حساب partsCount من items أو quota
      let partsCount = 0;
      if (Array.isArray(s.items) && s.items.length > 0) {
        partsCount = s.items.length;
      } else if (typeof s.quota === 'number' && s.quota > 0) {
        partsCount = s.quota;
      }

      // FIX: تحويل listeningAudioId إلى string بشكل موحد
      let listeningAudioIdValue: string | undefined = undefined;
      if (s.listeningAudioId) {
        if (typeof s.listeningAudioId === 'string') {
          listeningAudioIdValue = s.listeningAudioId;
        } else if (
          s.listeningAudioId &&
          typeof s.listeningAudioId === 'object' &&
          '_id' in s.listeningAudioId
        ) {
          listeningAudioIdValue = String(s.listeningAudioId._id || s.listeningAudioId);
        } else if (s.listeningAudioId.toString) {
          listeningAudioIdValue = s.listeningAudioId.toString();
        } else {
          listeningAudioIdValue = String(s.listeningAudioId);
        }
      }

      const result: any = {
        skill: s.skill,
        label: s.label || s.name || s.title,
        durationMin: s.durationMin,
        partsCount: s.partsCount || partsCount,
      };

      // FIX: إضافة listeningAudioId دائماً إذا كان موجوداً
      if (listeningAudioIdValue) {
        result.listeningAudioId = listeningAudioIdValue;
      }

      return result;
    });

    return {
      id: doc._id.toString(),
      title: doc.title,
      description: (doc as any).description,
      level: doc.level,
      provider: doc.provider,
      timeLimitMin: doc.timeLimitMin,
      attemptLimit: doc.attemptLimit,
      sections,
    };
  }

  /**
   * الحصول على قائمة مزوّدي الامتحانات المتاحة + مستوياتهم
   * يرجع قائمة بالـ providers الموجود لهم امتحانات منشورة من نوع provider_exam
   */
  async getProviders() {
    const filter: any = {
      status: ExamStatusEnum.PUBLISHED,
      examCategory: 'provider_exam',
    };

    const exams = await this.model.find(filter).select('provider level').lean().exec();

    // تجميع providers و levels
    const providerMap = new Map<string, Set<string>>();

    for (const exam of exams) {
      const provider = exam.provider as string;
      const level = exam.level as string;

      if (provider && level) {
        if (!providerMap.has(provider)) {
          providerMap.set(provider, new Set());
        }
        providerMap.get(provider)!.add(level);
      }
    }

    // تحويل إلى array
    const result = Array.from(providerMap.entries()).map(([provider, levelsSet]) => ({
      provider: provider as ProviderEnum | string,
      levels: Array.from(levelsSet).sort(),
    }));

    // ترتيب حسب provider (استخدام القيم من الـ enum)
    const providerOrder = [
      ProviderEnum.GOETHE,
      ProviderEnum.TELC,
      ProviderEnum.OESD,
      ProviderEnum.ECL,
      ProviderEnum.DTB,
      ProviderEnum.DTZ,
    ];
    result.sort((a, b) => {
      const aIndex = providerOrder.indexOf(a.provider as ProviderEnum);
      const bIndex = providerOrder.indexOf(b.provider as ProviderEnum);
      if (aIndex === -1 && bIndex === -1) return a.provider.localeCompare(b.provider);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    return result;
  }

  /**
   * إرجاع المهارات المتاحة مع عدد الامتحانات لكل مهارة (لمزود ومستوى معين)
   */
  async getProviderSkills(provider: string, level?: string) {
    const filter: any = {
      status: ExamStatusEnum.PUBLISHED,
      examCategory: 'provider_exam',
    };

    if (provider) {
      filter.provider = new RegExp(`^${provider}$`, 'i');
    }
    if (level) {
      filter.level = level;
    }

    const exams = await this.model.find(filter).select('mainSkill title').lean().exec();

    // تجميع بحسب المهارة
    const skillMap = new Map<string, number>();
    for (const exam of exams) {
      const skill = (exam as any).mainSkill || 'mixed';
      skillMap.set(skill, (skillMap.get(skill) || 0) + 1);
    }

    // ترتيب المهارات بترتيب منطقي
    const skillOrder = [
      'hoeren',
      'lesen',
      'schreiben',
      'sprechen',
      'sprachbausteine',
      'grammar',
      'mixed',
      'misc',
      'leben_test',
    ];
    const skillLabels: Record<string, string> = {
      hoeren: 'Hören',
      lesen: 'Lesen',
      schreiben: 'Schreiben',
      sprechen: 'Sprechen',
      sprachbausteine: 'Sprachbausteine',
      grammar: 'Grammatik',
      mixed: 'Gemischt',
      misc: 'Sonstiges',
      leben_test: 'Leben in Deutschland',
    };

    const skills = Array.from(skillMap.entries())
      .map(([skill, count]) => ({
        skill,
        label: skillLabels[skill] || skill,
        count,
      }))
      .sort((a, b) => {
        const aIdx = skillOrder.indexOf(a.skill);
        const bIdx = skillOrder.indexOf(b.skill);
        if (aIdx === -1 && bIdx === -1) return a.skill.localeCompare(b.skill);
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });

    return { provider, level: level || 'all', skills, totalExams: exams.length };
  }

  async findById(id: string, user?: ReqUser) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        `Invalid exam ID format: ${id}. Expected a valid MongoDB ObjectId (24 hex characters)`,
      );
    }
    const doc = await this.model.findById(id).lean().exec();
    if (!doc) throw new NotFoundException('Exam not found');

    // Log للتحقق من listeningAudioId في sections
    if (doc.sections && Array.isArray(doc.sections)) {
      doc.sections.forEach((s: any, index: number) => {
        if (s && s.skill === 'hoeren') {
          this.logger.log(
            `[findById] Section ${index} (skill=${s.skill}): listeningAudioId=${s.listeningAudioId} (type: ${typeof s.listeningAudioId})`,
          );
        }
      });
    }

    // التحكم بالوصول
    if (!user) throw new ForbiddenException();

    // Normalize sections: ensure it's an array and filter out null, undefined, and empty objects
    const normalizedSections = Array.isArray(doc.sections)
      ? doc.sections.filter((s: any) => {
          // Remove null or undefined
          if (s === null || s === undefined) {
            return false;
          }
          // Remove empty objects {} (objects with no keys or only undefined/null values)
          if (typeof s === 'object' && !Array.isArray(s)) {
            const keys = Object.keys(s);
            // If object has no keys, it's empty {}
            if (keys.length === 0) {
              return false;
            }
            // Check if object has any meaningful values (not all undefined/null)
            const hasValidValue = keys.some((key) => {
              const value = s[key];
              return value !== null && value !== undefined && value !== '';
            });
            return hasValidValue;
          }
          return true;
        })
      : [];

    const docWithNormalizedSections = { ...doc, sections: normalizedSections };

    const userId = user.userId || (user as any).sub || (user as any).id;
    const isOwner = doc.ownerId?.toString() === userId;
    const isAdmin = user.role === 'admin';

    // للمدرسين والأدمن: إرجاع كل البيانات بما فيها items (الأسئلة)
    if (isOwner || isAdmin) {
      this.logger.log(
        `[findById] Returning full exam data for ${isAdmin ? 'admin' : 'owner'} - examId: ${id}, sections count: ${normalizedSections.length}`,
      );
      // التأكد من أن sections تحتوي على items و listeningAudioId
      const sectionsWithItems = normalizedSections.map((s: any) => {
        if (!s) return s;
        // إرجاع القسم كاملاً مع items
        // تحويل listeningAudioId إلى string إذا كان موجوداً
        let listeningAudioIdValue: string | undefined = undefined;
        if (s.listeningAudioId) {
          if (typeof s.listeningAudioId === 'string') {
            listeningAudioIdValue = s.listeningAudioId;
          } else if (
            s.listeningAudioId &&
            typeof s.listeningAudioId === 'object' &&
            '_id' in s.listeningAudioId
          ) {
            // ObjectId
            listeningAudioIdValue = String(s.listeningAudioId._id || s.listeningAudioId);
          } else if (s.listeningAudioId.toString) {
            listeningAudioIdValue = s.listeningAudioId.toString();
          } else {
            listeningAudioIdValue = String(s.listeningAudioId);
          }
        }

        const result: any = {
          ...s,
          items: s.items || [], // التأكد من أن items موجودة حتى لو كانت فارغة
        };

        // FIX: إضافة listeningAudioId بشكل صريح دائماً (حتى لو كان undefined، لكن في JSON undefined لا يظهر)
        // لكن نضيفه فقط إذا كان موجوداً لتجنب إضافة undefined
        if (listeningAudioIdValue) {
          result.listeningAudioId = listeningAudioIdValue;
        }

        // Log للتحقق
        if (s.skill && s.skill.toLowerCase() === 'hoeren') {
          this.logger.log(
            `[findById] Section "${s.name || s.title}" (hoeren): listeningAudioId=${listeningAudioIdValue || 'NOT SET'}`,
          );
        }

        return result;
      });
      const fullResult: any = { ...docWithNormalizedSections, sections: sectionsWithItems };
      // لامتحانات الكتابة: إضافة hasQuestions لمعرفة إذا فيه أسئلة بعد المهمة
      if ((doc as any).mainSkill === 'schreiben' && (doc as any).schreibenTaskId) {
        fullResult.hasQuestions = sectionsWithItems.length > 0;
      }
      return fullResult;
    }

    if (user.role === 'student') {
      if (doc.status !== ExamStatusEnum.PUBLISHED) {
        throw new ForbiddenException('Students can view published exams only');
      }
      // إخفاء التفاصيل الحساسة لو كانت عشوائية
      const safeSections = normalizedSections.map((s: any) => {
        // تحويل listeningAudioId إلى string بشكل موحد
        let listeningAudioIdValue: string | undefined = undefined;
        if (s?.listeningAudioId) {
          if (typeof s.listeningAudioId === 'string') {
            listeningAudioIdValue = s.listeningAudioId;
          } else if (
            s.listeningAudioId &&
            typeof s.listeningAudioId === 'object' &&
            '_id' in s.listeningAudioId
          ) {
            listeningAudioIdValue = String(s.listeningAudioId._id || s.listeningAudioId);
          } else if (s.listeningAudioId.toString) {
            listeningAudioIdValue = s.listeningAudioId.toString();
          } else {
            listeningAudioIdValue = String(s.listeningAudioId);
          }
        }

        const hasQuota = typeof s?.quota === 'number' && s.quota > 0;
        if (hasQuota || doc.randomizeQuestions) {
          const result: any = {
            name: s?.name || s?.title || 'Unnamed Section',
            quota: s?.quota,
            difficultyDistribution: s?.difficultyDistribution,
          };
          // FIX: إضافة listeningAudioId دائماً إذا كان موجوداً
          if (listeningAudioIdValue) {
            result.listeningAudioId = listeningAudioIdValue;
          }
          return result;
        }
        // للطلاب: إخفاء questionIds (الأسئلة) لأسباب أمنية
        const result: any = {
          ...s,
          items: undefined,
        };
        // FIX: إضافة listeningAudioId دائماً إذا كان موجوداً
        if (listeningAudioIdValue) {
          result.listeningAudioId = listeningAudioIdValue;
        }

        // Log للتحقق
        if (s?.skill && s.skill.toLowerCase() === 'hoeren') {
          this.logger.log(
            `[findById] Student view - Section "${s.name || s.title}" (hoeren): listeningAudioId=${listeningAudioIdValue || 'NOT SET'}`,
          );
        }

        return result;
      });
      const studentResult: any = { ...docWithNormalizedSections, sections: safeSections };
      // لامتحانات الكتابة: إضافة hasQuestions لمعرفة إذا فيه أسئلة بعد المهمة
      if ((doc as any).mainSkill === 'schreiben' && (doc as any).schreibenTaskId) {
        studentResult.hasQuestions = safeSections.length > 0;
      }
      return studentResult;
    }
    // مدرس غير مالك: ما نسمحش
    if (user.role === 'teacher') {
      throw new ForbiddenException('Only owner teacher or admin can view');
    }

    throw new ForbiddenException();
  }

  async updateExam(id: string, dto: UpdateExamDto, user: ReqUser) {
    if (!user) throw new ForbiddenException();
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        `Invalid exam ID format: ${id}. Expected a valid MongoDB ObjectId (24 hex characters)`,
      );
    }
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Exam not found');

    const userId = user.userId || (user as any).sub || (user as any).id;
    const isOwner = doc.ownerId?.toString() === userId;
    const isAdmin = user.role === 'admin';
    if (!(isOwner || isAdmin)) throw new ForbiddenException('Only owner teacher or admin');

    // معالجة attemptsLimit و attemptLimit (دعم كلا الحقلين)
    const dtoAny = dto as any;
    if (dtoAny.attemptsLimit !== undefined) {
      dtoAny.attemptLimit = dtoAny.attemptsLimit; // تحويل attemptsLimit إلى attemptLimit للـ schema
    }
    // إذا كان attemptLimit موجود و attemptsLimit غير موجود، نستخدم attemptLimit
    if (dtoAny.attemptLimit !== undefined && dtoAny.attemptsLimit === undefined) {
      // نتركه كما هو للتوافق مع الكود القديم
    }

    // قيود بعد النشر
    const goingToPublish =
      dto.status === ExamStatusEnum.PUBLISHED && doc.status !== ExamStatusEnum.PUBLISHED;

    // ✅ تم إزالة القيود على التعديل بعد النشر
    // الآن Teacher يمكنه تعديل الامتحان بالكامل (sections, questions, answers) حتى بعد النشر
    // التعديلات ستطبق فقط على المحاولات الجديدة لأن:
    // 1. Attempts تحفظ snapshot للأسئلة والإجابات في AttemptItem
    // 2. Attempts تحفظ examVersion وقت بدء المحاولة
    // 3. Exam version يزيد عند تعديل sections/questions
    if (doc.status === ExamStatusEnum.PUBLISHED) {
      this.logger.log(
        `[updateExam] Updating published exam - examId: ${id}, userId: ${userId}, role: ${user.role}, isOwner: ${isOwner}`,
      );
      this.logger.log(
        `[updateExam] Changes will apply only to future attempts. Existing attempts preserve their snapshot.`,
      );
    }

    // تحققات قبل النشر: لكل سكشن بquota لازم quota>0، والتوزيع يساوي الكوتا (فقط لامتحانات القواعد)
    if (goingToPublish && (dto as any).sections) {
      const examCategory = (dto as any).examCategory || doc.examCategory;
      for (const s of (dto as any).sections) {
        // التحقق من difficultyDistribution فقط لامتحانات القواعد و Grammatik-Training
        if (
          (examCategory === ExamCategoryEnum.GRAMMAR || examCategory === ExamCategoryEnum.GRAMMATIK_TRAINING) &&
          typeof s.quota === 'number' &&
          s.quota > 0 &&
          s.difficultyDistribution
        ) {
          const { easy = 0, medium = 0, hard = 0 } = s.difficultyDistribution;
          const total = easy + medium + hard;
          if (total !== s.quota) {
            throw new BadRequestException(
              `Section "${s.name}" difficultyDistribution must sum to quota`,
            );
          }
        }
      }
    }

    // Validation خاص لـ "Deutschland-in-Leben" عند التحديث
    const updatedProvider = dto.provider !== undefined ? dto.provider : doc.provider;
    if (updatedProvider === 'Deutschland-in-Leben') {
      const updatedDto = { ...dto, sections: (dto as any).sections || doc.sections };
      this.validateDeutschlandInLebenStructure(updatedDto as CreateExamDto);
    }

    // تطبيق التحديث
    // معالجة خاصة لـ sections لأن Object.assign قد لا يعمل بشكل صحيح مع nested arrays
    let shouldIncrementVersion = false;
    if ((dto as any).sections !== undefined) {
      // التحقق من وجود تغيير فعلي في sections
      // نستخدم deep comparison لضمان اكتشاف أي تغيير في sections أو items أو questions
      const oldSectionsStr = JSON.stringify(doc.sections);
      const newSectionsStr = JSON.stringify((dto as any).sections);
      if (oldSectionsStr !== newSectionsStr) {
        shouldIncrementVersion = true;
        this.logger.log(
          `[updateExam] Sections/Questions changed - incrementing version from ${doc.version || 1} to ${(doc.version || 1) + 1}`,
        );
        this.logger.log(
          `[updateExam] This ensures existing attempts (with examVersion=${doc.version || 1}) remain unchanged. New attempts will use version ${(doc.version || 1) + 1}`,
        );
      }

      this.logger.log(
        `[updateExam] Updating sections - examId: ${id}, old sections: ${JSON.stringify(doc.sections)}, new sections: ${JSON.stringify((dto as any).sections)}`,
      );

      // تحويل questionId في items إلى ObjectId إذا كان string
      // وإزالة أي sections null أو undefined
      const processedSections = (dto as any).sections
        .filter((section: any) => section !== null && section !== undefined)
        .map((section: any) => {
          // معالجة listeningAudioId - تحويل string إلى ObjectId إذا كان موجوداً
          if (section.listeningAudioId) {
            if (
              typeof section.listeningAudioId === 'string' &&
              Types.ObjectId.isValid(section.listeningAudioId)
            ) {
              section.listeningAudioId = new Types.ObjectId(section.listeningAudioId);
            } else if (!(section.listeningAudioId instanceof Types.ObjectId)) {
              // إذا كان غير صالح، نحذفه
              delete section.listeningAudioId;
            }
          }

          // توحيد الحقول: name هو الحقل الموحد (name = name ?? title)
          section.name = section.name ?? section.title;
          // نسخ name إلى title للتوافق
          if (section.name && !section.title) {
            section.title = section.name;
          }

          if (section.items && Array.isArray(section.items)) {
            // إزالة null/undefined items
            section.items = section.items
              .filter((item: any) => item !== null && item !== undefined)
              .map((item: any) => {
                if (item.questionId) {
                  return {
                    ...item,
                    questionId:
                      item.questionId instanceof Types.ObjectId
                        ? item.questionId
                        : new Types.ObjectId(item.questionId),
                  };
                }
                return item;
              });
          }
          return section;
        });

      // التحقق من أن هناك sections صحيحة بعد التنظيف (فقط للامتحانات غير Grammar وغير Grammatik-Training وغير Schreiben)
      const examCategory = (dto as any).examCategory || doc.examCategory;
      const mainSkill = (dto as any).mainSkill || doc.mainSkill;
      const schreibenTaskId = (dto as any).schreibenTaskId || doc.schreibenTaskId;
      const isSchreibenExam = mainSkill === 'schreiben' && schreibenTaskId;
      const isGrammarOrTraining = examCategory === ExamCategoryEnum.GRAMMAR || examCategory === ExamCategoryEnum.GRAMMATIK_TRAINING;
      if (
        !isGrammarOrTraining &&
        !isSchreibenExam &&
        processedSections.length === 0
      ) {
        throw new BadRequestException('Exam must have at least one valid section');
      }

      // Final normalization: ensure no null, undefined, or empty objects
      const normalizedSections = processedSections.filter((s: any) => {
        // Remove null or undefined
        if (s === null || s === undefined) {
          return false;
        }
        // Remove empty objects {} (objects with no keys or only undefined/null values)
        if (typeof s === 'object' && !Array.isArray(s)) {
          const keys = Object.keys(s);
          // If object has no keys, it's empty {}
          if (keys.length === 0) {
            return false;
          }
          // Check if object has any meaningful values (not all undefined/null)
          const hasValidValue = keys.some((key) => {
            const value = s[key];
            return value !== null && value !== undefined && value !== '';
          });
          return hasValidValue;
        }
        return true;
      });

      // التحقق من أن هناك sections صحيحة بعد التنظيف (فقط للامتحانات غير Grammar وغير Grammatik-Training وغير Schreiben)
      if (
        !isGrammarOrTraining &&
        !isSchreibenExam &&
        normalizedSections.length === 0
      ) {
        throw new BadRequestException(
          'Exam must have at least one valid section (after filtering null/empty values)',
        );
      }

      this.logger.log(
        `[updateExam] Processed sections with ObjectId conversion - sections: ${JSON.stringify(normalizedSections.map((s: any) => ({ name: s.name, itemsCount: s.items?.length || 0, items: s.items?.map((i: any) => ({ questionId: String(i.questionId) })) || [] })))}`,
      );

      // استخدام set() و markModified لضمان أن Mongoose يحدث الحقل بشكل صحيح
      doc.set('sections', normalizedSections);
      doc.markModified('sections');
    }

    // تطبيق باقي التحديثات
    const { sections, attemptsLimit, ...restDto } = dto as any;
    // تنظيف difficultyDistribution: تحويل med إلى medium
    if (restDto.sections && Array.isArray(restDto.sections)) {
      restDto.sections = restDto.sections.map((s: any) => {
        if (s.difficultyDistribution && s.difficultyDistribution.med !== undefined) {
          s.difficultyDistribution.medium = s.difficultyDistribution.med;
          delete s.difficultyDistribution.med;
        }
        // تحويل skill إلى lowercase
        if (s.skill && typeof s.skill === 'string') {
          s.skill = s.skill.toLowerCase();
        }
        return s;
      });
    }
    Object.assign(doc, restDto);

    // Normalize provider before saving
    if (doc.provider) {
      const normalized = normalizeProvider(doc.provider);
      if (normalized) {
        doc.provider = normalized;
      }
    }

    // زيادة version عند تعديل sections/questions (Exam Versioning)
    // ✅ Data Integrity: عند زيادة version:
    // 1. المحاولات القديمة (examVersion < new version) تبقى محفوظة مع snapshot للأسئلة والإجابات
    // 2. المحاولات الجديدة ستستخدم version الجديد
    // 3. AttemptItem يحفظ snapshot كامل للأسئلة والإجابات، لذا المحاولات القديمة تبقى صالحة
    if (shouldIncrementVersion) {
      const oldVersion = doc.version || 1;
      doc.version = oldVersion + 1;
      this.logger.log(
        `[updateExam] Version incremented from ${oldVersion} to ${doc.version} - existing attempts (examVersion=${oldVersion}) remain unchanged`,
      );
    }

    // ✅ Data Integrity: التعديلات تطبق فقط على المحاولات الجديدة
    // المحاولات القديمة تحفظ snapshot في AttemptItem، لذا تبقى محفوظة بدون تأثر
    this.logger.log(
      `[updateExam] Saving exam - examId: ${id}, version: ${doc.version}, status: ${doc.status}, sections count: ${doc.sections?.length || 0}`,
    );
    await doc.save();
    this.logger.log(
      `[updateExam] Exam saved successfully - examId: ${id}, version: ${doc.version}. Changes will apply only to future attempts.`,
    );
    return doc.toObject();
  }

  /**
   * تحديث listeningAudioId في section معين
   * @param examId معرف الامتحان
   * @param skill skill السكشن (مثل 'hoeren')
   * @param teilNumber رقم الجزء (مثل 1, 2, 3) - اختياري
   * @param listeningAudioId معرف ملف الصوت
   * @param user المستخدم
   */
  async updateSectionAudio(
    examId: string,
    skill: string,
    teilNumber: number | null,
    listeningAudioId: string,
    user: ReqUser,
  ) {
    if (!user) throw new ForbiddenException();
    if (!Types.ObjectId.isValid(examId)) {
      throw new BadRequestException(`Invalid exam ID format: ${examId}`);
    }

    // التحقق من listeningAudioId قبل التحويل
    this.logger.log(
      `[updateSectionAudio] Received listeningAudioId from request: "${listeningAudioId}" (type: ${typeof listeningAudioId})`,
    );

    if (!listeningAudioId || !Types.ObjectId.isValid(listeningAudioId)) {
      throw new BadRequestException(
        `Invalid listeningAudioId format: ${listeningAudioId}. Must be a valid MongoDB ObjectId.`,
      );
    }

    // التحقق من وجود الامتحان والصلاحيات
    const doc = await this.model.findById(examId).exec();
    if (!doc) throw new NotFoundException('Exam not found');

    const userId = user.userId || (user as any).sub || (user as any).id;
    const isOwner = doc.ownerId?.toString() === userId;
    const isAdmin = user.role === 'admin';
    if (!(isOwner || isAdmin)) {
      throw new ForbiddenException('Only owner teacher or admin');
    }

    // بناء query للبحث عن section
    const normalizedSkill = skill.toLowerCase();
    const query: any = {
      _id: examId,
      'sections.skill': { $regex: new RegExp(`^${normalizedSkill}$`, 'i') },
    };

    // إضافة teilNumber إلى query إذا كان موجوداً
    if (teilNumber !== null && teilNumber !== undefined) {
      query['sections.teilNumber'] = teilNumber;
    }

    // استخدام findOneAndUpdate مع positional operator $ لتحديث section معين
    const updateQuery: any = {
      $set: {
        'sections.$.listeningAudioId': new Types.ObjectId(listeningAudioId),
      },
    };

    this.logger.log(
      `[updateSectionAudio] Updating exam ${examId}, query: ${JSON.stringify(query)}, update: ${JSON.stringify(updateQuery)}`,
    );

    const updatedDoc = await this.model
      .findOneAndUpdate(query, updateQuery, { new: true, runValidators: true })
      .exec();

    if (!updatedDoc) {
      const errorMsg =
        teilNumber !== null && teilNumber !== undefined
          ? `Section not found with skill="${skill}" and teilNumber=${teilNumber}`
          : `Section not found with skill="${skill}"`;
      throw new NotFoundException(errorMsg);
    }

    // البحث عن section المحدث
    const updatedSection = updatedDoc.sections.find((sec: any) => {
      const sectionSkill = (sec.skill || '').toLowerCase();
      if (teilNumber !== null && teilNumber !== undefined) {
        return sectionSkill === normalizedSkill && sec.teilNumber === teilNumber;
      }
      return sectionSkill === normalizedSkill;
    });

    if (!updatedSection) {
      throw new NotFoundException('Section not found after update');
    }

    const listeningAudioIdString = updatedSection.listeningAudioId?.toString() || null;
    const updatedAtValue = (updatedDoc as any).updatedAt || new Date();
    const examIdString = (updatedDoc as any)._id?.toString() || examId;

    this.logger.log(
      `[updateSectionAudio] Successfully updated listeningAudioId for exam ${examId}, section skill="${skill}"${teilNumber !== null && teilNumber !== undefined ? `, teilNumber=${teilNumber}` : ''}, listeningAudioId: ${listeningAudioIdString}, updatedAt: ${updatedAtValue}`,
    );

    // إرجاع response واضح يثبت أن التحديث تم
    return {
      success: true,
      message: 'Section audio updated successfully',
      examId: examIdString,
      updatedAt: updatedAtValue,
      section: {
        skill: updatedSection.skill,
        teilNumber: updatedSection.teilNumber,
        listeningAudioId: listeningAudioIdString,
        // إثبات أن listeningAudioId موجود في section المحدث
        hasListeningAudioId: !!updatedSection.listeningAudioId,
      },
      // إرجاع جميع sections للتأكد من أن التحديث تم
      allSections: updatedDoc.sections.map((s: any) => ({
        skill: s.skill,
        teilNumber: s.teilNumber,
        listeningAudioId: s.listeningAudioId?.toString() || null,
        hasListeningAudioId: !!s.listeningAudioId,
      })),
      // معلومات إضافية للتحقق
      verification: {
        queryUsed: query,
        updateUsed: updateQuery,
        sectionFound: !!updatedSection,
        listeningAudioIdSet: !!updatedSection.listeningAudioId,
      },
    };
  }

  /**
   * إصلاح الامتحان تلقائياً: إضافة quota للأقسام الفارغة
   * - للاستخدام من قبل admin فقط
   * - يفحص كل section وإذا كان فارغاً (لا items ولا quota) يضيف quota = 5
   */
  async fixEmptySections(examId: string, user: ReqUser) {
    if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
      throw new ForbiddenException('Only admin or teacher can fix exams');
    }

    if (!Types.ObjectId.isValid(examId)) {
      throw new BadRequestException(`Invalid exam ID format: ${examId}`);
    }

    const doc = await this.model.findById(examId).exec();
    if (!doc) throw new NotFoundException('Exam not found');

    // التحقق من أن المعلم هو مالك الامتحان
    if (user.role === 'teacher') {
      const userId = user.userId || (user as any).sub || (user as any).id;
      const ownerIdStr = doc.ownerId?.toString();
      const userIdStr = String(userId);

      this.logger.log(
        `[fixEmptySections] Checking ownership - examId: ${examId}, ownerId: ${ownerIdStr}, userId: ${userIdStr}`,
      );

      // مقارنة مرنة: ObjectId vs string
      const isOwner =
        ownerIdStr === userIdStr ||
        (doc.ownerId && String(doc.ownerId) === userIdStr) ||
        (ownerIdStr && ownerIdStr === String(userId));

      if (!isOwner) {
        this.logger.warn(
          `[fixEmptySections] Access denied - examId: ${examId}, ownerId: ${ownerIdStr}, userId: ${userIdStr}`,
        );
        throw new ForbiddenException('Only the exam owner can fix this exam');
      }

      this.logger.log(`[fixEmptySections] Ownership verified - examId: ${examId}`);
    }

    this.logger.log(
      `[fixEmptySections] Fixing exam - examId: ${examId}, current sections: ${JSON.stringify(doc.sections.map((s: any) => ({ name: s?.name, hasItems: Array.isArray(s?.items) && s.items.length > 0, hasQuota: typeof s?.quota === 'number' && s.quota > 0 })))}`,
    );

    let fixed = false;
    const updatedSections = doc.sections.map((s: any, index: number) => {
      if (!s || s === null) {
        // Section is null - create new section with quota
        this.logger.warn(
          `[fixEmptySections] Section ${index + 1} is null - creating new section with quota=5`,
        );
        fixed = true;
        return {
          name: `Section ${index + 1}`,
          quota: 5,
          tags: [],
        };
      }

      const hasItems = Array.isArray(s.items) && s.items.length > 0;
      const hasQuota = typeof s.quota === 'number' && s.quota > 0;

      if (!hasItems && !hasQuota) {
        // Section is empty - add quota
        this.logger.warn(
          `[fixEmptySections] Section "${s.name || `Section ${index + 1}`}" is empty - adding quota=5`,
        );
        fixed = true;
        return {
          ...s,
          quota: 5,
        };
      }

      // Section is valid - keep as is
      return s;
    });

    if (!fixed) {
      this.logger.log(`[fixEmptySections] No empty sections found - exam is already valid`);
      return {
        success: true,
        message: 'Exam is already valid - no empty sections found',
        examId,
        sections: doc.sections,
      };
    }

    // Update exam with fixed sections
    doc.set('sections', updatedSections);
    doc.markModified('sections');
    await doc.save();

    this.logger.log(
      `[fixEmptySections] Exam fixed successfully - examId: ${examId}, updated sections: ${JSON.stringify(updatedSections.map((s: any) => ({ name: s?.name, quota: s?.quota, itemsCount: s?.items?.length || 0 })))}`,
    );

    return {
      success: true,
      message: 'Exam sections fixed successfully',
      examId,
      sections: doc.sections,
      fixedSections: updatedSections.filter((s: any, index: number) => {
        const original = doc.sections[index];
        const hasItems = Array.isArray(s.items) && s.items.length > 0;
        const sAny = s as any;
        const originalAny = original as any;
        const hasQuota = typeof sAny?.quota === 'number' && sAny.quota > 0;
        const originalHasItems = Array.isArray(original?.items) && original.items.length > 0;
        const originalHasQuota = typeof originalAny?.quota === 'number' && originalAny.quota > 0;
        return (hasItems || hasQuota) && !(originalHasItems || originalHasQuota);
      }),
    };
  }

  /**
   * إيجاد جميع الامتحانات التي sections فارغة
   * - للاستخدام من قبل admin فقط
   */
  async findExamsWithEmptySections(user: ReqUser) {
    if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
      throw new ForbiddenException('Only admin or teacher can view this information');
    }

    const userId = user.userId || (user as any).sub || (user as any).id;
    const isAdmin = user.role === 'admin';

    // Admin: جميع الامتحانات، Teacher: امتحاناته فقط
    // نستخدم $or للبحث في ownerId سواء كان ObjectId أو string
    const query = isAdmin
      ? {}
      : {
          $or: [{ ownerId: new Types.ObjectId(userId) }, { ownerId: userId }],
        };
    this.logger.log(
      `[findExamsWithEmptySections] userId: ${userId}, role: ${user.role}, isAdmin: ${isAdmin}`,
    );
    const allExams = await this.model.find(query).lean().exec();
    this.logger.log(`[findExamsWithEmptySections] Found ${allExams.length} exam(s)`);

    const examsWithEmptySections = allExams
      .map((exam: any) => {
        this.logger.log(
          `[findExamsWithEmptySections] Checking exam: ${exam._id?.toString() || String(exam._id)}, title: ${exam.title}, sections count: ${exam.sections?.length || 0}`,
        );

        // التحقق من وجود sections
        if (!Array.isArray(exam.sections) || exam.sections.length === 0) {
          this.logger.warn(
            `[findExamsWithEmptySections] Exam ${exam._id?.toString() || String(exam._id)} has no sections array or empty array`,
          );
          return {
            examId: exam._id?.toString() || String(exam._id),
            title: exam.title,
            level: exam.level,
            provider: exam.provider,
            status: exam.status,
            emptySections: [],
            reason: 'No sections array or empty array',
          };
        }

        // التحقق من أن جميع الـ sections ليست null
        const allSectionsAreNull = exam.sections.every((s: any) => s === null || s === undefined);
        if (allSectionsAreNull) {
          this.logger.warn(
            `[findExamsWithEmptySections] Exam ${exam._id?.toString() || String(exam._id)} has all sections as null`,
          );
          return {
            examId: exam._id?.toString() || String(exam._id),
            title: exam.title,
            level: exam.level,
            provider: exam.provider,
            status: exam.status,
            emptySections: exam.sections.map((s: any, index: number) => ({
              index: index + 1,
              name: `Section ${index + 1}`,
              reason: 'Section is null',
            })),
            reason: 'All sections are null',
          };
        }

        const emptySections = exam.sections
          .map((s: any, index: number) => {
            if (!s || s === null || s === undefined) {
              this.logger.warn(
                `[findExamsWithEmptySections] Exam ${exam._id?.toString() || String(exam._id)} - Section ${index + 1} is null/undefined`,
              );
              return {
                index: index + 1,
                name: `Section ${index + 1}`,
                reason: 'Section is null or undefined',
              };
            }

            const hasItems = Array.isArray(s.items) && s.items.length > 0;
            const hasQuota = typeof s.quota === 'number' && s.quota > 0;

            if (!hasItems && !hasQuota) {
              this.logger.warn(
                `[findExamsWithEmptySections] Exam ${exam._id?.toString() || String(exam._id)} - Section "${s.name || s.section || `Section ${index + 1}`}" is empty (no items, no quota)`,
              );
              return {
                index: index + 1,
                name: s.name || s.section || `Section ${index + 1}`,
                reason: 'No items and no quota',
              };
            }

            return null;
          })
          .filter((s: any) => s !== null);

        if (emptySections.length === 0) {
          return null;
        }

        this.logger.warn(
          `[findExamsWithEmptySections] Exam ${exam._id?.toString() || String(exam._id)} has ${emptySections.length} empty section(s)`,
        );

        return {
          examId: exam._id?.toString() || String(exam._id),
          title: exam.title,
          level: exam.level,
          provider: exam.provider,
          status: exam.status,
          emptySections,
        };
      })
      .filter((exam: any) => exam !== null);

    return {
      totalExams: allExams.length,
      examsWithEmptySections: examsWithEmptySections.length,
      exams: examsWithEmptySections,
    };
  }

  /**
   * فحص تفاصيل sections الامتحان
   * - للاستخدام من قبل admin/teacher
   */
  async checkExamSections(examId: string, user: ReqUser) {
    if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
      throw new ForbiddenException('Only admin or teacher can view this information');
    }

    if (!Types.ObjectId.isValid(examId)) {
      throw new BadRequestException(`Invalid exam ID format: ${examId}`);
    }

    const exam = await this.model.findById(examId).lean().exec();
    if (!exam) throw new NotFoundException('Exam not found');

    // التحقق من أن المعلم هو مالك الامتحان
    if (user.role === 'teacher') {
      const userId = user.userId || (user as any).sub || (user as any).id;
      const ownerIdStr = (exam as any).ownerId?.toString();
      const userIdStr = String(userId);

      const isOwner =
        ownerIdStr === userIdStr ||
        ((exam as any).ownerId && String((exam as any).ownerId) === userIdStr) ||
        (ownerIdStr && ownerIdStr === String(userId));

      if (!isOwner) {
        throw new ForbiddenException('Only the exam owner can view this information');
      }
    }

    const sectionsDetails =
      (exam as any).sections?.map((s: any, index: number) => {
        const hasItems = Array.isArray(s?.items) && s.items.length > 0;
        const hasQuota = typeof s?.quota === 'number' && s.quota > 0;
        const isEmpty = !s || s === null || (!hasItems && !hasQuota);

        return {
          index: index + 1,
          name: s?.name || `Section ${index + 1}`,
          isNull: !s || s === null,
          hasItems,
          itemsCount: s?.items?.length || 0,
          hasQuota,
          quota: s?.quota || null,
          isEmpty,
          reason: isEmpty
            ? !s || s === null
              ? 'Section is null'
              : 'No items and no quota'
            : 'Valid section',
          raw: s,
        };
      }) || [];

    return {
      examId: (exam as any)._id?.toString() || String((exam as any)._id),
      title: exam.title,
      ownerId: (exam as any).ownerId?.toString() || String((exam as any).ownerId),
      sectionsCount: (exam as any).sections?.length || 0,
      sections: sectionsDetails,
      hasEmptySections: sectionsDetails.some((s: any) => s.isEmpty),
      emptySectionsCount: sectionsDetails.filter((s: any) => s.isEmpty).length,
    };
  }

  /**
   * إصلاح جميع الامتحانات التي sections فارغة
   * - للاستخدام من قبل admin فقط
   */
  async fixAllExamsWithEmptySections(user: ReqUser) {
    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('Only admin can fix exams');
    }

    const allExams = await this.model.find({}).exec();
    const results: Array<{ examId: string; title: string; status: string }> = [];

    for (const exam of allExams) {
      let hasEmptySections = false;
      const updatedSections = exam.sections.map((s: any, index: number) => {
        if (!s || s === null) {
          hasEmptySections = true;
          return {
            title: `Section ${index + 1}`,
            quota: 5,
            tags: [],
          };
        }

        const sAny = s as any;
        const hasItems = Array.isArray(s.items) && s.items.length > 0;
        const hasQuota = typeof sAny?.quota === 'number' && sAny.quota > 0;

        if (!hasItems && !hasQuota) {
          hasEmptySections = true;
          return {
            ...s,
            name: s.name || sAny?.name || s.title || `Section ${index + 1}`,
            quota: 5,
          };
        }

        return s;
      });

      if (hasEmptySections) {
        // Normalize provider before saving
        if (exam.provider) {
          const normalized = normalizeProvider(exam.provider);
          if (normalized) {
            exam.provider = normalized;
          }
        }
        exam.set('sections', updatedSections);
        exam.markModified('sections');
        await exam.save();

        results.push({
          examId: exam._id?.toString() || String(exam._id),
          title: exam.title,
          status: 'fixed',
        });
      }
    }

    return {
      success: true,
      message: `Fixed ${results.length} exam(s) with empty sections`,
      fixedExams: results,
      totalFixed: results.length,
    };
  }

  async assignExam(id: string, dto: AssignExamDto, user: ReqUser) {
    if (!user) throw new ForbiddenException();
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Exam not found');

    const userId = user.userId || (user as any).sub || (user as any).id;
    const isOwner = doc.ownerId?.toString() === userId;
    const isAdmin = user.role === 'admin';
    if (!(isOwner || isAdmin)) throw new ForbiddenException('Only owner teacher or admin');

    if (!dto.classId && !dto.studentIds) {
      throw new BadRequestException('Provide classId or studentIds');
    }

    if (dto.classId) (doc as any).assignedClassId = new Types.ObjectId(dto.classId);
    if (dto.studentIds)
      (doc as any).assignedStudentIds = dto.studentIds.map((id) => new Types.ObjectId(id));

    // Normalize provider before saving
    if (doc.provider) {
      const normalized = normalizeProvider(doc.provider);
      if (normalized) {
        doc.provider = normalized;
      }
    }

    await doc.save();

    return {
      assignedClassId: (doc as any).assignedClassId,
      assignedStudentIds: (doc as any).assignedStudentIds,
    };
  }

  async removeExam(id: string, user: ReqUser, hard: boolean = false) {
    if (!user) throw new ForbiddenException();
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Exam not found');

    const userId = user.userId || (user as any).sub || (user as any).id;
    const isOwner = doc.ownerId?.toString() === userId;
    const isAdmin = user.role === 'admin';
    if (!(isOwner || isAdmin))
      throw new ForbiddenException('Only owner teacher or admin can delete');

    // التحقق من وجود محاولات مرتبطة بالامتحان
    const AttemptModel = this.model.db.collection('attempts');
    const attemptCount = await AttemptModel.countDocuments({ examId: new Types.ObjectId(id) });

    this.logger.log(
      `[removeExam] Exam deletion request - examId: ${id}, userId: ${userId}, role: ${user.role}, isOwner: ${isOwner}, hard: ${hard}, attemptCount: ${attemptCount}`,
    );

    if (attemptCount > 0 && !hard) {
      // Soft delete: إذا كان هناك attempts، نطلب hard delete
      // ✅ Teacher يمكنه استخدام hard=true لحذف الامتحان وجميع المحاولات المرتبطة به
      this.logger.warn(
        `[removeExam] Cannot soft delete exam with ${attemptCount} attempt(s). Use hard=true to permanently delete exam and all related attempts.`,
      );
      throw new BadRequestException({
        code: 'EXAM_HAS_ATTEMPTS',
        message: `Cannot delete exam with ${attemptCount} attempt(s). Use hard=true to permanently delete exam and all related attempts.`,
        attemptCount,
        hint: 'Add ?hard=true to the query string to force delete (will delete exam and all attempts permanently)',
      });
    }

    if (hard) {
      // Hard delete: حذف نهائي للامتحان وجميع المحاولات المرتبطة به
      // ⚠️ تحذير: هذا سيحذف الامتحان وكل المحاولات المرتبطة به نهائياً
      // العميل على علم كامل بالتأثير ووافق عليه
      this.logger.warn(
        `[removeExam] Hard delete requested - examId: ${id}, attemptCount: ${attemptCount}. This will permanently delete the exam and all related attempts.`,
      );

      // حذف جميع المحاولات المرتبطة بالامتحان أولاً
      let deletedAttemptsCount = 0;
      if (attemptCount > 0) {
        const deleteAttemptsResult = await AttemptModel.deleteMany({
          examId: new Types.ObjectId(id),
        });
        deletedAttemptsCount = deleteAttemptsResult.deletedCount || 0;
        this.logger.warn(
          `[removeExam] Deleted ${deletedAttemptsCount} attempt(s) related to exam ${id} (permanent deletion)`,
        );
      }

      // حذف الامتحان نهائياً
      await this.model.findByIdAndDelete(id).exec();
      this.logger.log(
        `[removeExam] Exam and all related attempts deleted permanently - examId: ${id}, deletedAttempts: ${deletedAttemptsCount}`,
      );
      return {
        message: 'Exam and all related attempts deleted permanently',
        id,
        deletedAttempts: deletedAttemptsCount,
        totalAttempts: attemptCount,
      };
    } else {
      // Soft delete: تغيير الحالة إلى archived
      // ✅ Soft delete يحافظ على الامتحان والمحاولات المرتبطة به
      // المحاولات القديمة تبقى محفوظة مع snapshot للأسئلة والإجابات
      doc.status = ExamStatusEnum.ARCHIVED;

      // Normalize provider before saving
      if (doc.provider) {
        const normalized = normalizeProvider(doc.provider);
        if (normalized) {
          doc.provider = normalized;
        }
      }

      await doc.save();
      this.logger.log(
        `[removeExam] Exam archived successfully - examId: ${id}, attemptCount: ${attemptCount}`,
      );
      return {
        message: 'Exam archived successfully',
        id: doc._id,
        status: doc.status,
        attemptCount,
      };
    }
  }

  /**
   * أرشفة امتحان (بدلاً من الحذف)
   */
  async archive(id: string, user: ReqUser) {
    if (!user) throw new ForbiddenException();
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Exam not found');

    const userId = user.userId || (user as any).sub || (user as any).id;
    const isOwner = doc.ownerId?.toString() === userId;
    const isAdmin = user.role === 'admin';
    if (!(isOwner || isAdmin))
      throw new ForbiddenException('Only owner teacher or admin can archive');

    doc.status = ExamStatusEnum.ARCHIVED;

    // Normalize provider before saving
    if (doc.provider) {
      const normalized = normalizeProvider(doc.provider);
      if (normalized) {
        doc.provider = normalized;
      }
    }

    await doc.save();

    return {
      message: 'Exam archived successfully',
      id: doc._id,
      status: doc.status,
    };
  }

  async debugExamStructure(id: string) {
    const exam = await this.model.findById(id).exec();
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const QuestionModel = this.model.db.collection('questions');
    const debugInfo: any = {
      examId: (exam._id as Types.ObjectId).toString(),
      examTitle: exam.title,
      provider: exam.provider,
      level: exam.level,
      status: exam.status,
      mainSkill: (exam as any).mainSkill,
      sections: [],
      totalQuestionsAvailable: 0,
      issues: [],
    };

    if (!exam.sections || exam.sections.length === 0) {
      debugInfo.issues.push('No sections defined in exam');
      return debugInfo;
    }

    for (const section of exam.sections) {
      const sectionAny = section as any;
      const sectionInfo: any = {
        name: sectionAny?.name || sectionAny?.title || 'Unnamed',
        quota: sectionAny?.quota,
        tags: sectionAny?.tags || [],
        difficultyDistribution: sectionAny?.difficultyDistribution,
        availableQuestions: {},
        totalAvailable: 0,
        issues: [],
      };

      // البحث عن الأسئلة المتاحة لكل مستوى صعوبة
      const baseQuery: any = {
        status: 'published',
        level: exam.level,
        mainSkill: (exam as any).mainSkill || 'leben_test',
      };

      if (sectionAny?.tags && Array.isArray(sectionAny.tags) && sectionAny.tags.length > 0) {
        baseQuery.tags = { $in: sectionAny.tags };
      }

      // FIX: للأسئلة الخاصة بالولايات (Leben in Deutschland)
      const validStates = [
        'Baden-Württemberg',
        'Bayern',
        'Berlin',
        'Brandenburg',
        'Bremen',
        'Hamburg',
        'Hessen',
        'Mecklenburg-Vorpommern',
        'Niedersachsen',
        'Nordrhein-Westfalen',
        'Rheinland-Pfalz',
        'Saarland',
        'Sachsen',
        'Sachsen-Anhalt',
        'Schleswig-Holstein',
        'Thüringen',
      ];

      const examMainSkill = (exam as any).mainSkill;
      if (
        (exam.provider === 'leben_in_deutschland' ||
          exam.provider === 'Deutschland-in-Leben' ||
          exam.provider?.toLowerCase() === 'lid' ||
          exam.provider?.toLowerCase() === 'deutschland-in-leben') &&
        examMainSkill === 'leben_test'
      ) {
        // البحث عن ولاية في tags
        const stateTag = sectionAny.tags?.find((tag: string) => validStates.includes(tag));

        if (stateTag) {
          // هذا قسم خاص بالولاية - نضيف فلتر على usageCategory و state
          baseQuery.usageCategory = 'state_specific';
          baseQuery.state = stateTag;
        } else if (sectionAny.tags?.includes('300-Fragen')) {
          // هذا قسم الـ 300 سؤال - نضيف فلتر على usageCategory
          baseQuery.usageCategory = 'common';
        }
      }

      if (sectionAny?.difficultyDistribution) {
        for (const [difficulty, count] of Object.entries(sectionAny.difficultyDistribution)) {
          const countNum = typeof count === 'number' ? (count as number) : 0;
          const query = { ...baseQuery, difficulty };
          const available = await QuestionModel.countDocuments(query);
          sectionInfo.availableQuestions[difficulty] = available;
          sectionInfo.totalAvailable += available;

          if (available < countNum) {
            sectionInfo.issues.push(
              `Need ${countNum} ${difficulty} questions, but only ${available} available`,
            );
          }
        }
      } else {
        // بدون توزيع صعوبة
        const available = await QuestionModel.countDocuments(baseQuery);
        sectionInfo.totalAvailable = available;
        if (
          sectionAny?.quota &&
          typeof sectionAny.quota === 'number' &&
          available < sectionAny.quota
        ) {
          sectionInfo.issues.push(
            `Need ${sectionAny.quota} questions, but only ${available} available`,
          );
        }
      }

      debugInfo.sections.push(sectionInfo);
      debugInfo.totalQuestionsAvailable += sectionInfo.totalAvailable;

      if (sectionInfo.issues.length > 0) {
        debugInfo.issues.push(
          ...sectionInfo.issues.map(
            (i: string) =>
              `Section "${sectionInfo.name || sectionAny?.name || sectionAny?.title || 'Unnamed'}": ${i}`,
          ),
        );
      }
    }

    return debugInfo;
  }

  // =====================================================
  // ============ Section Management (Admin) =============
  // =====================================================

  /**
   * توليد key فريد للقسم
   */
  private generateSectionKey(title?: string, skill?: string, teilNumber?: number): string {
    if (skill && teilNumber) return `${skill}_teil${teilNumber}`;
    if (title)
      return title
        .toLowerCase()
        .replace(/[^a-z0-9äöüß]+/g, '_')
        .replace(/(^_|_$)/g, '');
    return `section_${Date.now()}`;
  }

  /**
   * مفتاح مستقر للقسم: إذا القسم بدون key وبدون title/skill/teil نستخدم _default
   * (امتحانات أُنشئت من غير قسم → قسم تلقائي واحد)
   */
  private getStableSectionKey(s: any): string {
    if (s.key && String(s.key).trim()) return String(s.key).trim();
    const hasIdentity = (s.title || s.name || s.skill || s.teilNumber);
    if (hasIdentity) return this.generateSectionKey(s.title || s.name, s.skill, s.teilNumber);
    return '_default';
  }

  /**
   * البحث عن قسم بواسطة key
   */
  private findSectionByKey(exam: any, sectionKey: string): any {
    const section = exam.sections?.find((s: any) => {
      const k = this.getStableSectionKey(s);
      return k === sectionKey;
    });
    if (!section) {
      // Auto-create _default section for sectionless exams
      if (sectionKey === '_default') {
        if (!exam.sections) exam.sections = [];
        const defaultSection = { key: '_default', title: '_default', name: '_default', items: [] };
        exam.sections.push(defaultSection);
        exam.markModified('sections');
        return exam.sections[exam.sections.length - 1];
      }
      throw new NotFoundException(`Section with key "${sectionKey}" not found in exam`);
    }
    return section;
  }

  /**
   * إضافة قسم جديد للامتحان
   */
  async addSection(examId: string, dto: AddSectionDto, user: ReqUser) {
    this.assertTeacherOrAdmin(user);

    const exam = await this.model.findById(examId);
    if (!exam) throw new NotFoundException('Exam not found');

    // التحقق من الملكية
    const isOwner = exam.ownerId?.toString() === user.userId;
    if (user.role !== 'admin' && !isOwner) {
      throw new ForbiddenException('Only owner or admin can modify this exam');
    }

    // توليد key إذا لم يكن موجود
    const key = dto.key || this.generateSectionKey(dto.title, dto.skill, dto.teilNumber);

    // التحقق من عدم تكرار الـ key
    const existingKeys = (exam.sections || []).map(
      (s: any) => s.key || this.generateSectionKey(s.title || s.name, s.skill, s.teilNumber),
    );
    if (existingKeys.includes(key)) {
      throw new BadRequestException(`Section key "${key}" already exists in this exam`);
    }

    const newSection: any = {
      key,
      title: dto.title,
      name: dto.title, // للتوافق مع الكود القديم
      description: dto.description,
      skill: dto.skill,
      teilNumber: dto.teilNumber,
      timeLimitMin: dto.timeLimitMin,
      randomize: dto.randomize,
      tags: dto.tags,
      order: dto.order ?? (exam.sections?.length || 0),
      items: [],
    };

    exam.sections = exam.sections || [];
    exam.sections.push(newSection);
    exam.version = (exam.version || 1) + 1;
    await exam.save();

    this.logger.log(`[addSection] Added section "${key}" to exam ${examId}`);
    return newSection;
  }

  /**
   * تحديث بيانات قسم
   */
  async updateSection(examId: string, sectionKey: string, dto: UpdateSectionDto, user: ReqUser) {
    this.assertTeacherOrAdmin(user);

    const exam = await this.model.findById(examId);
    if (!exam) throw new NotFoundException('Exam not found');

    const isOwner = exam.ownerId?.toString() === user.userId;
    if (user.role !== 'admin' && !isOwner) {
      throw new ForbiddenException('Only owner or admin can modify this exam');
    }

    const sectionIndex = (exam.sections || []).findIndex((s: any) => {
      const k = s.key || this.generateSectionKey(s.title || s.name, s.skill, s.teilNumber);
      return k === sectionKey;
    });
    if (sectionIndex === -1) {
      throw new NotFoundException(`Section with key "${sectionKey}" not found`);
    }

    // إذا تم تغيير الـ key، تحقق من عدم التكرار
    if (dto.key && dto.key !== sectionKey) {
      const existingKeys = exam.sections
        .filter((_: any, i: number) => i !== sectionIndex)
        .map(
          (s: any) => s.key || this.generateSectionKey(s.title || s.name, s.skill, s.teilNumber),
        );
      if (existingKeys.includes(dto.key)) {
        throw new BadRequestException(`Section key "${dto.key}" already exists`);
      }
    }

    const section = exam.sections[sectionIndex] as any;

    // دمج التحديثات
    if (dto.title !== undefined) {
      section.title = dto.title;
      section.name = dto.title;
    }
    if (dto.key !== undefined) section.key = dto.key;
    if (dto.description !== undefined) section.description = dto.description;
    if (dto.skill !== undefined) section.skill = dto.skill;
    if (dto.teilNumber !== undefined) section.teilNumber = dto.teilNumber;
    if (dto.timeLimitMin !== undefined) section.timeLimitMin = dto.timeLimitMin;
    if (dto.randomize !== undefined) section.randomize = dto.randomize;
    if (dto.tags !== undefined) section.tags = dto.tags;
    if (dto.order !== undefined) section.order = dto.order;

    exam.markModified('sections');
    exam.version = (exam.version || 1) + 1;
    await exam.save();

    this.logger.log(`[updateSection] Updated section "${sectionKey}" in exam ${examId}`);
    return section;
  }

  /**
   * حذف قسم من الامتحان
   */
  async removeSection(examId: string, sectionKey: string, user: ReqUser) {
    this.assertTeacherOrAdmin(user);

    const exam = await this.model.findById(examId);
    if (!exam) throw new NotFoundException('Exam not found');

    const isOwner = exam.ownerId?.toString() === user.userId;
    if (user.role !== 'admin' && !isOwner) {
      throw new ForbiddenException('Only owner or admin can modify this exam');
    }

    const beforeCount = exam.sections?.length || 0;
    exam.sections = (exam.sections || []).filter((s: any) => {
      const k = s.key || this.generateSectionKey(s.title || s.name, s.skill, s.teilNumber);
      return k !== sectionKey;
    });

    if (exam.sections.length === beforeCount) {
      throw new NotFoundException(`Section with key "${sectionKey}" not found`);
    }

    exam.markModified('sections');
    exam.version = (exam.version || 1) + 1;
    await exam.save();

    this.logger.log(`[removeSection] Removed section "${sectionKey}" from exam ${examId}`);
    return { deleted: true, sectionKey };
  }

  /**
   * تنظيف الأسئلة المكررة والمحذوفة من جميع أقسام الامتحانات
   */
  async cleanupAllExamSections(user: ReqUser) {
    this.assertTeacherOrAdmin(user);

    const exams = await this.model.find({ 'sections.0': { $exists: true } }).exec();
    let totalCleaned = 0;
    let examsModified = 0;

    for (const exam of exams) {
      let modified = false;
      const allQuestionIds = (exam.sections || [])
        .flatMap((s: any) => (s.items || []).map((item: any) => item.questionId))
        .filter(Boolean);

      // جلب الأسئلة غير المؤرشفة (تشمل published وأي status آخر ما عدا archived)
      const activeQuestions = await this.questionModel
        .find({ _id: { $in: allQuestionIds }, status: { $ne: 'archived' } })
        .select('_id')
        .lean();
      const publishedIds = new Set(activeQuestions.map((q: any) => q._id.toString()));

      for (const section of (exam as any).sections || []) {
        if (!section.items || !Array.isArray(section.items)) continue;
        const before = section.items.length;
        const seen = new Set<string>();
        section.items = section.items.filter((item: any) => {
          const qId = item.questionId?.toString();
          if (!qId) return false;
          // إزالة غير المنشورة
          if (!publishedIds.has(qId)) return false;
          // إزالة المكررة
          if (seen.has(qId)) return false;
          seen.add(qId);
          return true;
        });
        if (section.items.length < before) {
          modified = true;
          totalCleaned += before - section.items.length;
        }
      }

      if (modified) {
        exam.markModified('sections');
        exam.version = (exam.version || 1) + 1;
        await exam.save();
        examsModified++;
      }
    }

    return {
      examsScanned: exams.length,
      examsModified,
      questionsRemoved: totalCleaned,
    };
  }

  /**
   * جلب أقسام الامتحان للأدمن (مع تفاصيل الأسئلة)
   */
  async getAdminSections(examId: string, user: ReqUser) {
    this.assertTeacherOrAdmin(user);

    const exam = await this.model.findById(examId).lean();
    if (!exam) throw new NotFoundException('Exam not found');

    // جلب الأسئلة غير المؤرشفة مع بياناتها لعرضها في لوحة التحكم
    const allQuestionIds = (exam.sections || [])
      .flatMap((s: any) => (s.items || []).map((item: any) => item.questionId))
      .filter(Boolean);
    const questionsMap = new Map<string, any>();
    if (allQuestionIds.length > 0) {
      const activeQuestions = await this.questionModel
        .find({ _id: { $in: allQuestionIds }, status: { $ne: 'archived' } })
        .select('_id prompt type level')
        .lean();
      for (const q of activeQuestions) {
        questionsMap.set((q as any)._id.toString(), q);
      }
    }

    // إخفاء قسم _default من واجهة الأدمن ما لم يكن الامتحان بدون أقسام (فقط _default) — حينها نعرضه لتعديل المحتوى والأسئلة
    const allSections = exam.sections || [];
    const defaultSectionRaw = allSections.find(
      (s: any) => this.getStableSectionKey(s) === '_default',
    );
    const visibleSections = allSections.filter((s: any) => {
      const key = s.key || this.generateSectionKey(s.title || s.name, s.skill, s.teilNumber);
      return key !== '_default';
    });
    const sectionsToMap =
      visibleSections.length > 0
        ? visibleSections
        : defaultSectionRaw
          ? [defaultSectionRaw]
          : [];

    const sections = sectionsToMap.map((s: any, index: number) => {
      const key = s.key || this.generateSectionKey(s.title || s.name, s.skill, s.teilNumber);
      const publishedItems = (s.items || []).filter((item: any) =>
        questionsMap.has(item.questionId?.toString()),
      );
      return {
        key,
        title: key === '_default' ? 'المحتوى' : (s.title || s.name),
        description: s.description,
        skill: s.skill,
        teilNumber: s.teilNumber,
        timeLimitMin: s.timeLimitMin,
        quota: s.quota,
        difficultyDistribution: s.difficultyDistribution,
        listeningAudioId: s.listeningAudioId,
        randomize: s.randomize,
        tags: s.tags,
        order: s.order ?? index,
        questionCount: publishedItems.length,
        questions: publishedItems.map((item: any) => {
          const qData = questionsMap.get(item.questionId?.toString());
          return {
            questionId: item.questionId,
            points: item.points ?? 1,
            prompt: qData?.prompt,
            type: qData?.type,
            level: qData?.level,
          };
        }),
      };
    });

    // ترتيب حسب order ثم teilNumber
    sections.sort(
      (a: any, b: any) =>
        (a.order ?? 0) - (b.order ?? 0) || (a.teilNumber ?? 0) - (b.teilNumber ?? 0),
    );

    return { examId, title: exam.title, sections, hasSections: sections.length > 0 };
  }

  /**
   * إضافة سؤال لقسم معين
   */
  async addQuestionToSection(
    examId: string,
    sectionKey: string,
    dto: AddQuestionToSectionDto,
    user: ReqUser,
  ) {
    this.assertTeacherOrAdmin(user);

    const exam = await this.model.findById(examId);
    if (!exam) throw new NotFoundException('Exam not found');

    const isOwner = exam.ownerId?.toString() === user.userId;
    if (user.role !== 'admin' && !isOwner) {
      throw new ForbiddenException('Only owner or admin can modify this exam');
    }

    // التحقق من وجود السؤال
    const question = await this.questionModel.findById(dto.questionId);
    if (!question) throw new NotFoundException(`Question ${dto.questionId} not found`);

    // البحث عن القسم
    const section = this.findSectionByKey(exam, sectionKey) as any;

    // التحقق من عدم تكرار السؤال في القسم
    const alreadyExists = (section.items || []).some(
      (item: any) => item.questionId?.toString() === dto.questionId,
    );
    if (alreadyExists) {
      throw new BadRequestException(
        `Question ${dto.questionId} already exists in section "${sectionKey}"`,
      );
    }

    section.items = section.items || [];
    section.items.push({
      questionId: new Types.ObjectId(dto.questionId),
      points: dto.points ?? 1,
    });

    exam.markModified('sections');
    exam.version = (exam.version || 1) + 1;
    await exam.save();

    // ربط السؤال بالامتحان (metadata)
    await this.questionModel.findByIdAndUpdate(dto.questionId, {
      examId: new Types.ObjectId(examId),
      sectionTitle: section.title || section.name,
    });

    this.logger.log(
      `[addQuestionToSection] Added question ${dto.questionId} to section "${sectionKey}" in exam ${examId}`,
    );
    return { questionId: dto.questionId, points: dto.points ?? 1, sectionKey };
  }

  /**
   * إنشاء أسئلة بدون تحديد قسم (للامتحانات بدون أقسام)
   * يتم إنشاء قسم _default تلقائياً إذا لم يكن موجوداً
   */
  async bulkCreateWithoutSection(
    examId: string,
    dto: BulkCreateSectionQuestionsDto,
    user: ReqUser,
  ) {
    this.logger.log(
      `[bulkCreateWithoutSection] Creating questions without section for exam ${examId}`,
    );
    return this.bulkCreateAndAddToSection(examId, '_default', dto, user);
  }

  /**
   * إنشاء عدة أسئلة دفعة واحدة وإضافتها لقسم مع صوت مشترك
   */
  async bulkCreateAndAddToSection(
    examId: string,
    sectionKey: string,
    dto: BulkCreateSectionQuestionsDto,
    user: ReqUser,
  ) {
    this.assertTeacherOrAdmin(user);

    const exam = await this.model.findById(examId);
    if (!exam) throw new NotFoundException('Exam not found');

    const isOwner = exam.ownerId?.toString() === user.userId;
    if (user.role !== 'admin' && !isOwner) {
      throw new ForbiddenException('Only owner or admin can modify this exam');
    }

    const section = this.findSectionByKey(exam, sectionKey) as any;

    // التحقق من وجود كليب الصوت (اختياري - للكتابة وغيرها لا يوجد صوت)
    let clipId: Types.ObjectId | null = null;
    if (dto.listeningClipId) {
      const clip = await this.listeningClipModel.findById(dto.listeningClipId).lean();
      if (!clip) {
        throw new NotFoundException(`ListeningClip ${dto.listeningClipId} not found`);
      }
      clipId = new Types.ObjectId(dto.listeningClipId);
      // تعيين listeningAudioId على الـ section عشان الـ attempt يعرف إن الصوت مشترك ولا يكرره
      section.listeningAudioId = clipId;
    }

    // فقرة القراءة المشتركة (اختياري - لأسئلة Lesen) أو بلوكات محتوى (Sprechen)
    let passageId: Types.ObjectId | null = null;
    if (
      dto.readingPassage?.trim() ||
      (dto.readingCards && dto.readingCards.length > 0) ||
      (dto.contentBlocks && dto.contentBlocks.length > 0)
    ) {
      passageId = new Types.ObjectId();
    }

    const results: Array<{
      index: number;
      questionId: any;
      prompt: string;
      qType: string;
      points: number;
    }> = [];
    const errors: Array<{ index: number; prompt: string; error: string }> = [];

    const userId = user.userId;
    const questions = dto.questions || [];

    // محتوى بدون أسئلة: إنشاء سؤال contentOnly جديد دائماً (بدون حذف القديم)
    if (questions.length === 0 && passageId) {
      try {
        section.items = section.items || [];

        const contentData = {
          ...(clipId && { listeningClipId: clipId }),
          ...(dto.readingPassage?.trim()
            ? { readingPassage: dto.readingPassage.trim() }
            : { readingPassage: null }),
          ...(dto.readingPassageBgColor?.trim()
            ? { readingPassageBgColor: dto.readingPassageBgColor.trim() }
            : {}),
          ...(dto.readingCards && dto.readingCards.length > 0
            ? { readingCards: dto.readingCards }
            : { readingCards: [] }),
          ...(dto.cardsLayout ? { cardsLayout: dto.cardsLayout } : {}),
          ...(dto.contentBlocks && dto.contentBlocks.length > 0
            ? { contentBlocks: dto.contentBlocks.sort((a, b) => a.order - b.order) }
            : { contentBlocks: [] }),
        };

        // إنشاء سؤال contentOnly جديد (بدون استبدال القديم)
        const doc = await this.questionModel.create({
          prompt: '—',
          qType: QuestionType.MCQ,
          options: [
            { text: '✓', isCorrect: true },
            { text: '—', isCorrect: false },
          ],
          contentOnly: true,
          ...(exam.provider && { provider: exam.provider }),
          ...contentData,
          readingPassageId: passageId,
          status: QuestionStatus.PUBLISHED,
          createdBy: userId,
        });
        section.items.push({
          questionId: new Types.ObjectId(doc._id as any),
          points: 0,
        });
        await this.questionModel.findByIdAndUpdate(doc._id, {
          examId: new Types.ObjectId(examId),
          sectionTitle: section.title || section.name,
        });
        this.logger.log(
          `[bulkCreateAndAddToSection] Created new contentOnly question ${doc._id} in section "${section.title || section.name}"`,
        );
        results.push({
          index: 0,
          questionId: doc._id,
          prompt: '(محتوى فقط)',
          qType: 'mcq',
          points: 0,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ index: 0, prompt: '(محتوى فقط)', error: errorMessage });
      }
    }

    for (let i = 0; i < questions.length; i++) {
      try {
        const question = questions[i];
        const {
          examId: _ignoreExamId,
          listeningClipId: _ignoreClipId,
          points,
          ...questionData
        } = question as any;

        const doc = await this.questionModel.create({
          ...questionData,
          ...(exam.provider && { provider: exam.provider }),
          ...(clipId && { listeningClipId: clipId }),
          ...(passageId && {
            readingPassageId: passageId,
            ...(dto.readingPassage?.trim() && { readingPassage: dto.readingPassage.trim() }),
            ...(dto.readingPassageBgColor?.trim() && {
              readingPassageBgColor: dto.readingPassageBgColor.trim(),
            }),
            ...(dto.readingCards &&
              dto.readingCards.length > 0 && { readingCards: dto.readingCards }),
            ...(dto.cardsLayout && { cardsLayout: dto.cardsLayout }),
            ...(dto.contentBlocks &&
              dto.contentBlocks.length > 0 && {
                contentBlocks: dto.contentBlocks.sort((a, b) => a.order - b.order),
              }),
          }),
          status: question.status ?? QuestionStatus.PUBLISHED,
          createdBy: userId,
          // FREE_TEXT fields
          ...(question.qType === QuestionType.FREE_TEXT && {
            ...(question.sampleAnswer && { sampleAnswer: question.sampleAnswer }),
            ...(question.minWords !== undefined && { minWords: question.minWords }),
            ...(question.maxWords !== undefined && { maxWords: question.maxWords }),
          }),
          // SPEAKING fields
          ...(question.qType === QuestionType.SPEAKING && {
            ...(question.modelAnswerText && { modelAnswerText: question.modelAnswerText }),
            ...(question.minSeconds !== undefined && { minSeconds: question.minSeconds }),
            ...(question.maxSeconds !== undefined && { maxSeconds: question.maxSeconds }),
          }),
          // INTERACTIVE_TEXT fields
          ...(question.qType === QuestionType.INTERACTIVE_TEXT && {
            ...(question.text && { text: question.text }),
            ...(question.interactiveBlanks &&
              Array.isArray(question.interactiveBlanks) &&
              question.interactiveBlanks.length > 0 && {
                interactiveBlanks: question.interactiveBlanks.map((blank: any) => {
                  const type = blank.type === 'select' ? 'dropdown' : blank.type;
                  const options = blank.options || blank.choices;
                  const choices = blank.choices || blank.options;
                  return { ...blank, type, options, choices };
                }),
              }),
            ...(question.interactiveReorder && { interactiveReorder: question.interactiveReorder }),
          }),
        });

        const questionPoints = points ?? 1;

        section.items = section.items || [];
        section.items.push({
          questionId: new Types.ObjectId(doc._id as any),
          points: questionPoints,
        });

        // ربط السؤال بالامتحان (metadata)
        await this.questionModel.findByIdAndUpdate(doc._id, {
          examId: new Types.ObjectId(examId),
          sectionTitle: section.title || section.name,
        });

        results.push({
          index: i,
          questionId: doc._id,
          prompt: doc.prompt,
          qType: doc.qType,
          points: questionPoints,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({
          index: i,
          prompt: questions[i]?.prompt || 'Unknown',
          error: errorMessage,
        });
      }
    }

    if (results.length > 0) {
      exam.markModified('sections');
      exam.version = (exam.version || 1) + 1;
      await exam.save();
    }

    this.logger.log(
      `[bulkCreateAndAddToSection] Created ${results.length}/${questions.length || 1} questions in section "${sectionKey}" of exam ${examId}`,
    );

    return {
      success: results.length,
      failed: errors.length,
      total: questions.length || 1,
      sectionKey,
      ...(dto.listeningClipId && { listeningClipId: dto.listeningClipId }),
      results,
      ...(errors.length > 0 && { errors }),
    };
  }

  /**
   * حذف سؤال من قسم
   */
  async removeQuestionFromSection(
    examId: string,
    sectionKey: string,
    questionId: string,
    user: ReqUser,
  ) {
    this.assertTeacherOrAdmin(user);

    const exam = await this.model.findById(examId);
    if (!exam) throw new NotFoundException('Exam not found');

    const isOwner = exam.ownerId?.toString() === user.userId;
    if (user.role !== 'admin' && !isOwner) {
      throw new ForbiddenException('Only owner or admin can modify this exam');
    }

    const section = this.findSectionByKey(exam, sectionKey) as any;

    const beforeCount = section.items?.length || 0;
    section.items = (section.items || []).filter(
      (item: any) => item.questionId?.toString() !== questionId,
    );

    if (section.items.length === beforeCount) {
      throw new NotFoundException(`Question ${questionId} not found in section "${sectionKey}"`);
    }

    exam.markModified('sections');
    exam.version = (exam.version || 1) + 1;
    await exam.save();

    this.logger.log(
      `[removeQuestionFromSection] Removed question ${questionId} from section "${sectionKey}" in exam ${examId}`,
    );
    return { removed: true, questionId, sectionKey };
  }

  /**
   * تحديث نقاط سؤال في قسم
   */
  async updateQuestionPoints(
    examId: string,
    sectionKey: string,
    questionId: string,
    points: number,
    user: ReqUser,
  ) {
    this.assertTeacherOrAdmin(user);

    const exam = await this.model.findById(examId);
    if (!exam) throw new NotFoundException('Exam not found');

    const isOwner = exam.ownerId?.toString() === user.userId;
    if (user.role !== 'admin' && !isOwner) {
      throw new ForbiddenException('Only owner or admin can modify this exam');
    }

    const section = this.findSectionByKey(exam, sectionKey) as any;
    const item = (section.items || []).find(
      (item: any) => item.questionId?.toString() === questionId,
    );

    if (!item) {
      throw new NotFoundException(`Question ${questionId} not found in section "${sectionKey}"`);
    }

    item.points = points;

    exam.markModified('sections');
    exam.version = (exam.version || 1) + 1;
    await exam.save();

    this.logger.log(
      `[updateQuestionPoints] Updated points to ${points} for question ${questionId} in section "${sectionKey}" of exam ${examId}`,
    );
    return { questionId, points, sectionKey };
  }

  /**
   * إعادة ترتيب الأسئلة في قسم
   */
  async reorderSectionQuestions(
    examId: string,
    sectionKey: string,
    dto: ReorderSectionQuestionsDto,
    user: ReqUser,
  ) {
    this.assertTeacherOrAdmin(user);

    const exam = await this.model.findById(examId);
    if (!exam) throw new NotFoundException('Exam not found');

    const isOwner = exam.ownerId?.toString() === user.userId;
    if (user.role !== 'admin' && !isOwner) {
      throw new ForbiddenException('Only owner or admin can modify this exam');
    }

    const section = this.findSectionByKey(exam, sectionKey) as any;
    const currentItems = section.items || [];

    // التحقق من تطابق الـ IDs
    const currentIds = currentItems.map((item: any) => item.questionId?.toString());
    const newIds = dto.questionIds;

    if (currentIds.length !== newIds.length) {
      throw new BadRequestException(
        'questionIds count must match current questions count in section',
      );
    }

    for (const id of newIds) {
      if (!currentIds.includes(id)) {
        throw new BadRequestException(`Question ${id} not found in section "${sectionKey}"`);
      }
    }

    // إعادة الترتيب
    const itemMap = new Map(currentItems.map((item: any) => [item.questionId?.toString(), item]));
    section.items = newIds.map((id: string) => itemMap.get(id));

    exam.markModified('sections');
    exam.version = (exam.version || 1) + 1;
    await exam.save();

    this.logger.log(
      `[reorderSectionQuestions] Reordered questions in section "${sectionKey}" in exam ${examId}`,
    );
    return section.items;
  }

  // =====================================================
  // ============ Section Navigation (Student) ===========
  // =====================================================

  /**
   * نظرة عامة على الأقسام مع تقدم الطالب
   */
  async getSectionsOverview(examId: string, userId?: string) {
    const exam = await this.model.findById(examId).lean();
    if (!exam) throw new NotFoundException('Exam not found');

    // جلب آخر محاولة للطالب (إذا كان مسجل دخول)
    let attemptItems: any[] = [];
    if (userId) {
      const latestAttempt = await this.attemptModel
        .findOne({
          examId: new Types.ObjectId(examId),
          studentId: new Types.ObjectId(userId),
        })
        .sort({ createdAt: -1 })
        .lean();

      if (latestAttempt) {
        attemptItems = latestAttempt.items || [];
      }
    }

    // جلب الأسئلة لحساب عدد التمارين (Übungen) حسب listeningClipId
    const allQuestionIds = (exam.sections || [])
      .flatMap((s: any) => (s.items || []).map((item: any) => item.questionId))
      .filter(Boolean);

    // امتحان Leben: لا أقسام — كل الأسئلة تعرض مجتمعة بدون تقسيم
    const isLebenExam =
      (exam as any).examCategory === 'leben_exam' || (exam as any).examType === 'leben_test';
    if (isLebenExam) {
      return { sections: [] };
    }

    const questionClipMap = new Map<string, string | null>();
    const publishedQuestionIds = new Set<string>();
    if (allQuestionIds.length > 0) {
      const allQuestions = await this.questionModel
        .find({ _id: { $in: allQuestionIds }, status: { $ne: 'archived' } })
        .select('listeningClipId')
        .lean();
      for (const q of allQuestions) {
        const qId = (q as any)._id.toString();
        publishedQuestionIds.add(qId);
        const clipId = q.listeningClipId ? q.listeningClipId.toString() : null;
        questionClipMap.set(qId, clipId);
      }
    }

    const sections = (exam.sections || []).map((s: any, index: number) => {
      const key = this.getStableSectionKey(s);
      // عد فقط الأسئلة المنشورة (تجاهل المحذوفة/المؤرشفة) مع إزالة التكرارات
      const seenItemIds = new Set<string>();
      let publishedItems = (s.items || []).filter((item: any) => {
        const id = item.questionId?.toString();
        if (!id || !publishedQuestionIds.has(id) || seenItemIds.has(id)) return false;
        seenItemIds.add(id);
        return true;
      });
      // امتحان Leben: إذا القسم فاضي والأسئلة في المحاولة فقط، نستخدم عناصر المحاولة
      if (isLebenExam && publishedItems.length === 0 && attemptItems.length > 0) {
        const withKey = attemptItems.filter((ai: any) => ai.sectionKey === key);
        if (withKey.length > 0) {
          publishedItems = withKey.map((ai: any) => ({ questionId: ai.questionId }));
        } else {
          const sortedSections = [...(exam.sections || [])].sort(
            (a: any, b: any) =>
              (a.order ?? 0) - (b.order ?? 0) || (a.teilNumber ?? 0) - (b.teilNumber ?? 0),
          );
          const sectionIndex = sortedSections.findIndex(
            (sec: any) =>
              (sec.key || this.generateSectionKey(sec.title, sec.skill, sec.teilNumber)) === key,
          );
          if (sectionIndex === 0)
            publishedItems = attemptItems
              .slice(0, 30)
              .map((ai: any) => ({ questionId: ai.questionId }));
          else if (sectionIndex === 1)
            publishedItems = attemptItems
              .slice(30, 33)
              .map((ai: any) => ({ questionId: ai.questionId }));
        }
      }
      const questionCount = publishedItems.length;

      // حساب عدد التمارين (مجموعات listeningClipId الفريدة + أسئلة بدون صوت)
      const clipIds = new Set<string>();
      let noAudioCount = 0;
      for (const item of publishedItems) {
        const clipId = questionClipMap.get(item.questionId?.toString());
        if (clipId) {
          clipIds.add(clipId);
        } else {
          noAudioCount++;
        }
      }
      const exerciseCount = clipIds.size + noAudioCount;

      // حساب التقدم
      let answered = 0;
      if (attemptItems.length > 0) {
        const sectionItemIds = publishedItems.map((item: any) => item.questionId?.toString());
        answered = attemptItems.filter((ai: any) => {
          if (ai.sectionKey === key) {
            return (
              ai.studentAnswerText !== undefined ||
              ai.studentAnswerIndexes !== undefined ||
              ai.studentAnswerBoolean !== undefined ||
              ai.studentAnswerMatch !== undefined ||
              ai.studentReorderAnswer !== undefined ||
              ai.studentInteractiveAnswers !== undefined
            );
          }
          // fallback: تطابق بواسطة questionId
          if (!ai.sectionKey && sectionItemIds.includes(ai.questionId?.toString())) {
            return (
              ai.studentAnswerText !== undefined ||
              ai.studentAnswerIndexes !== undefined ||
              ai.studentAnswerBoolean !== undefined ||
              ai.studentAnswerMatch !== undefined ||
              ai.studentReorderAnswer !== undefined ||
              ai.studentInteractiveAnswers !== undefined
            );
          }
          return false;
        }).length;
      }

      return {
        key,
        title: s.title || s.name,
        skill: s.skill,
        teilNumber: s.teilNumber,
        questionCount,
        exerciseCount,
        order: s.order ?? index,
        timeLimitMin: s.timeLimitMin,
        progress: {
          answered,
          total: questionCount,
          percent: questionCount > 0 ? Math.round((answered / questionCount) * 100) : 0,
        },
      };
    });

    // ترتيب حسب order ثم teilNumber
    sections.sort(
      (a: any, b: any) =>
        (a.order ?? 0) - (b.order ?? 0) || (a.teilNumber ?? 0) - (b.teilNumber ?? 0),
    );

    // هل الامتحان يحتوي على أقسام حقيقية (غير _default)؟
    const realSections = (exam.sections || []).filter(
      (s: any) => (s.key || this.generateSectionKey(s.title || s.name, s.skill, s.teilNumber)) !== '_default',
    );
    const hasSections = realSections.length > 0;

    return {
      examId: (exam as any)._id,
      title: exam.title,
      level: exam.level,
      provider: exam.provider,
      mainSkill: (exam as any).mainSkill,
      hasSections,
      sections,
    };
  }

  /**
   * جلب أسئلة قسم معين مع تقدم الطالب
   */
  async getSectionQuestions(examId: string, sectionKey: string, userId?: string) {
    const exam = await this.model.findById(examId).lean();
    if (!exam) throw new NotFoundException('Exam not found');

    const section = this.findSectionByKey(exam, sectionKey);
    let items: any[] = section.items || [];

    // امتحان Leben: الأسئلة تكون في المحاولة فقط — نأخذها من آخر محاولة للطالب
    const isLebenExam =
      (exam as any).examCategory === 'leben_exam' || (exam as any).examType === 'leben_test';
    if (items.length === 0 && isLebenExam && userId) {
      const latestAttempt = await this.attemptModel
        .findOne({ examId: new Types.ObjectId(examId), studentId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .lean();
      const attemptItems = latestAttempt?.items || [];
      if (attemptItems.length > 0) {
        const withKey = attemptItems.filter((ai: any) => ai.sectionKey === sectionKey);
        if (withKey.length > 0) {
          items = withKey.map((ai: any) => ({ questionId: ai.questionId }));
        } else {
          const sortedSections = [...(exam.sections || [])].sort(
            (a: any, b: any) =>
              (a.order ?? 0) - (b.order ?? 0) || (a.teilNumber ?? 0) - (b.teilNumber ?? 0),
          );
          const secKey =
            section.key ||
            this.generateSectionKey(
              section.title || section.name,
              section.skill,
              section.teilNumber,
            );
          const sectionIndex = sortedSections.findIndex(
            (s: any) =>
              (s.key || this.generateSectionKey(s.title, s.skill, s.teilNumber)) === secKey,
          );
          if (sectionIndex === 0)
            items = attemptItems.slice(0, 30).map((ai: any) => ({ questionId: ai.questionId }));
          else if (sectionIndex === 1)
            items = attemptItems.slice(30, 33).map((ai: any) => ({ questionId: ai.questionId }));
        }
      }
    }

    // إزالة التكرارات من items قبل المعالجة (نفس questionId مرتين = خطأ في البيانات)
    const seenQIds = new Set<string>();
    items = items.filter((item: any) => {
      const id = item.questionId?.toString();
      if (!id || seenQIds.has(id)) return false;
      seenQIds.add(id);
      return true;
    });

    if (items.length === 0) {
      return {
        sectionKey,
        sectionTitle: section.title || section.name,
        exercises: [],
        exerciseCount: 0,
      };
    }

    // جلب تفاصيل الأسئلة مع populate لبيانات الكليب الصوتي (فقط المنشورة)
    const questionIds = items.map((item: any) => item.questionId);
    const questions = await this.questionModel
      .find({ _id: { $in: questionIds }, status: { $ne: 'archived' } })
      .select(
        'prompt text qType options answerKeyBoolean answerKeyMatch matchPairs answerKeyReorder interactiveText interactiveBlanks interactiveReorder fillExact media images difficulty tags status listeningClipId audioUrl readingPassageId readingPassage readingPassageBgColor readingCards cardsLayout contentBlocks contentOnly sampleAnswer minWords maxWords',
      )
      .populate('listeningClipId', 'title audioUrl audioKey teil')
      .lean();

    // تطبيع contentBlocks: استعادة type من blockType (لو Mongoose حذف type عند الحفظ)
    const questionsWithNormalizedBlocks = (questions as any[]).map((q: any) => {
      if (!Array.isArray(q.contentBlocks) || q.contentBlocks.length === 0) return q;
      return {
        ...q,
        contentBlocks: q.contentBlocks.map((b: any) => ({ ...b, type: b.type ?? b.blockType })),
      };
    });
    const questionMap = new Map(questionsWithNormalizedBlocks.map((q: any) => [q._id.toString(), q]));

    // جلب بيانات التقدم من آخر محاولة
    const attemptItemMap = new Map<string, any>();
    if (userId) {
      const latestAttempt = await this.attemptModel
        .findOne({
          examId: new Types.ObjectId(examId),
          studentId: new Types.ObjectId(userId),
        })
        .sort({ createdAt: -1 })
        .lean();

      if (latestAttempt) {
        for (const ai of latestAttempt.items || []) {
          attemptItemMap.set(ai.questionId?.toString(), ai);
        }
      }
    }

    // Helper: تحديد حالة السؤال
    const getQuestionStatus = (questionId: string) => {
      const attemptItem = attemptItemMap.get(questionId);
      if (!attemptItem) return { status: 'unanswered', score: undefined };
      const hasAnswer =
        attemptItem.studentAnswerText !== undefined ||
        attemptItem.studentAnswerIndexes !== undefined ||
        attemptItem.studentAnswerBoolean !== undefined ||
        attemptItem.studentAnswerMatch !== undefined ||
        attemptItem.studentReorderAnswer !== undefined ||
        attemptItem.studentInteractiveAnswers !== undefined;
      return {
        status: hasAnswer ? 'answered' : 'unanswered',
        score: hasAnswer ? attemptItem.autoScore : undefined,
      };
    };

    // تجميع الأسئلة في تمارين (Übungen) حسب listeningClipId أو readingPassageId
    // الأسئلة بنفس الـ groupId = تمرين واحد (صوت مشترك أو فقرة مشتركة + أسئلة)
    const exerciseMap = new Map<
      string,
      {
        type: 'audio' | 'passage';
        clipData: any;
        passageText: string | null;
        passageBgColor: string | null;
        readingCards: any[] | null;
        cardsLayout: string | null;
        contentBlocks: any[] | null;
        questions: any[];
      }
    >();
    const exerciseOrder: string[] = []; // ترتيب التمارين حسب الظهور الأول
    const ungroupedQuestions: any[] = [];

    for (const item of items) {
      const q = questionMap.get(item.questionId?.toString());
      if (!q) continue;

      // استخراج بيانات الكليب (قد يكون populated object أو ObjectId)
      let clipId: string | null = null;
      let clipData: any = null;

      if (q.listeningClipId) {
        if (typeof q.listeningClipId === 'object' && q.listeningClipId._id) {
          clipId = q.listeningClipId._id.toString();
          clipData = q.listeningClipId;
        } else {
          clipId = q.listeningClipId.toString();
        }
      }

      // استخراج readingPassageId
      let passageId: string | null = null;
      if (q.readingPassageId) {
        passageId = q.readingPassageId.toString();
      }

      const { status, score } = getQuestionStatus(item.questionId?.toString());

      const questionData = {
        questionId: item.questionId,
        prompt: q.prompt || q.text || '',
        qType: q.qType,
        difficulty: q.difficulty,
        media: q.media,
        images: q.images,
        points: item.points ?? 1,
        status,
        score,
        ...(q.contentOnly && { contentOnly: true }),
        // MCQ options
        ...(q.options && { options: q.options }),
        // TRUE_FALSE
        ...(q.answerKeyBoolean !== undefined && { answerKeyBoolean: q.answerKeyBoolean }),
        // MATCH
        ...(q.answerKeyMatch && { answerKeyMatch: q.answerKeyMatch }),
        ...(q.matchPairs && { matchPairs: q.matchPairs }),
        // REORDER
        ...(q.answerKeyReorder && { answerKeyReorder: q.answerKeyReorder }),
        // FILL
        ...(q.fillExact && { fillExact: q.fillExact }),
        // INTERACTIVE_TEXT
        ...(q.interactiveText && { interactiveText: q.interactiveText }),
        ...(q.interactiveBlanks && { interactiveBlanks: q.interactiveBlanks }),
        ...(q.interactiveReorder && { interactiveReorder: q.interactiveReorder }),
        // FREE_TEXT
        ...(q.sampleAnswer && { sampleAnswer: q.sampleAnswer }),
        ...(q.minWords !== undefined && { minWords: q.minWords }),
        ...(q.maxWords !== undefined && { maxWords: q.maxWords }),
        // محتوى التمرين (بطاقات / بلوكات) — للأسئلة غير المجمعة (مثل Sprechen Teil 3)
        ...(q.readingCards && q.readingCards.length > 0 && { readingCards: q.readingCards }),
        ...(q.cardsLayout && { cardsLayout: q.cardsLayout }),
        ...(q.contentBlocks && q.contentBlocks.length > 0 && { contentBlocks: q.contentBlocks }),
      };

      // تحديد groupId: إما clipId (صوت) أو passageId (فقرة)
      const groupId = clipId || passageId;
      const groupType: 'audio' | 'passage' = clipId ? 'audio' : 'passage';

      if (groupId) {
        if (!exerciseMap.has(groupId)) {
          exerciseMap.set(groupId, {
            type: groupType,
            clipData,
            passageText: q.readingPassage || null,
            passageBgColor: q.readingPassageBgColor || null,
            readingCards: q.readingCards || null,
            cardsLayout: q.cardsLayout || null,
            contentBlocks: q.contentBlocks || null,
            questions: [],
          });
          exerciseOrder.push(groupId);
        }
        // ✅ تحديث بيانات التمرين من أي سؤال يحملها (ليس فقط الأول)
        const group = exerciseMap.get(groupId)!;
        if (!group.contentBlocks && q.contentBlocks) group.contentBlocks = q.contentBlocks;
        if (!group.readingCards && q.readingCards) group.readingCards = q.readingCards;
        if (!group.cardsLayout && q.cardsLayout) group.cardsLayout = q.cardsLayout;
        if (!group.passageText && q.readingPassage) group.passageText = q.readingPassage;
        if (!group.passageBgColor && q.readingPassageBgColor) group.passageBgColor = q.readingPassageBgColor;
        if (!group.clipData && clipData) group.clipData = clipData;
        group.questions.push(questionData);
      } else {
        ungroupedQuestions.push({
          ...questionData,
          _contentBlocks: q.contentBlocks || null,
          _readingCards: q.readingCards || null,
          _cardsLayout: q.cardsLayout || null,
          _readingPassage: q.readingPassage || null,
          _readingPassageBgColor: q.readingPassageBgColor || null,
        });
      }
    }

    // بناء مصفوفة التمارين
    const exercises: any[] = [];
    let exerciseIndex = 1;
    const teilNum = section.teilNumber || 1;

    // تمارين مجمّعة (صوت أو فقرة) بترتيب الظهور الأول
    for (const groupId of exerciseOrder) {
      const group = exerciseMap.get(groupId)!;
      const realQuestions = group.questions.filter((q: any) => !q.contentOnly);
      const answered = realQuestions.filter((q: any) => q.status === 'answered').length;
      const total = realQuestions.length;

      // توليد pre-signed URL للصوت (صالح 24 ساعة)
      let audioUrl: string | null = null;
      if (group.type === 'audio' && group.clipData) {
        audioUrl = await this.getSignedAudioUrl(group.clipData);
      }

      exercises.push({
        exerciseNumber: `${teilNum}.${exerciseIndex}`,
        title: `Übung ${teilNum}.${exerciseIndex}`,
        listeningClipId: group.type === 'audio' ? groupId : null,
        audioUrl,
        readingPassage: group.type === 'passage' ? group.passageText : null,
        readingPassageBgColor: group.type === 'passage' ? group.passageBgColor : null,
        readingCards: group.type === 'passage' ? group.readingCards : null,
        cardsLayout: group.type === 'passage' ? group.cardsLayout : null,
        contentBlocks: group.contentBlocks || null,
        questionCount: total,
        progress: {
          answered,
          total,
          percent: total > 0 ? Math.round((answered / total) * 100) : 0,
        },
        questions: group.questions,
      });
      exerciseIndex++;
    }

    // أسئلة غير مجمّعة → كل سؤال تمرين لحاله (نستخدم readingCards/contentBlocks من السؤال)
    for (const qData of ungroupedQuestions) {
      // ✅ استخدام بيانات المحتوى من السؤال نفسه (contentBlocks, readingCards, etc.)
      const { _contentBlocks, _readingCards, _cardsLayout, _readingPassage, _readingPassageBgColor, ...cleanQData } = qData;
      exercises.push({
        exerciseNumber: `${teilNum}.${exerciseIndex}`,
        title: `Übung ${teilNum}.${exerciseIndex}`,
        listeningClipId: null,
        audioUrl: null,
        readingPassage: _readingPassage || null,
        readingCards: _readingCards || null,
        cardsLayout: _cardsLayout || null,
        contentBlocks: _contentBlocks || null,
        readingPassageBgColor: _readingPassageBgColor || null,
        questionCount: 1,
        progress: {
          answered: cleanQData.status === 'answered' ? 1 : 0,
          total: 1,
          percent: cleanQData.status === 'answered' ? 100 : 0,
        },
        questions: [cleanQData],
      });
      exerciseIndex++;
    }

    return {
      sectionKey,
      sectionTitle: section.title || section.name,
      skill: section.skill,
      teilNumber: section.teilNumber,
      timeLimitMin: section.timeLimitMin,
      exerciseCount: exercises.length,
      exercises,
    };
  }

  /**
   * توليد pre-signed URL للصوت (صالح 24 ساعة)
   * يدعم الكليبات القديمة (بدون audioKey) عبر استخراج الـ key من الـ URL
   */
  private async getSignedAudioUrl(clipData: any): Promise<string | null> {
    if (!clipData) return null;

    // استخدام audioKey إذا موجود (الكليبات الجديدة)
    const key = clipData.audioKey || this.extractS3KeyFromUrl(clipData.audioUrl);
    if (key) {
      try {
        return await this.mediaService.getPresignedUrl(key, 86400); // 24 ساعة
      } catch (err) {
        this.logger.warn(`Failed to generate presigned URL for key ${key}: ${err}`);
      }
    }

    // fallback: الرابط المخزّن مباشرة
    return clipData.audioUrl || null;
  }

  /**
   * استخراج S3 key من رابط الصوت (للكليبات القديمة بدون audioKey)
   * URL format: https://endpoint/bucket/audio/timestamp-random.mp3
   */
  private extractS3KeyFromUrl(url: string): string | null {
    if (!url) return null;
    // البحث عن مسار يبدأ بـ audio/ في الـ URL
    const match = url.match(/(audio\/[^?#]+)/);
    return match ? match[1] : null;
  }

  /**
   * جلب التسجيلات الصوتية المستخدمة في قسم معين
   * لإعادة استخدامها عند إنشاء أسئلة جديدة
   */
  async getSectionClips(examId: string, sectionKey: string) {
    const exam = await this.model.findById(examId).lean();
    if (!exam) throw new NotFoundException('Exam not found');

    const section = this.findSectionByKey(exam, sectionKey);
    const items = section.items || [];

    if (items.length === 0) {
      return { sectionKey, clips: [] };
    }

    // جلب الأسئلة مع populate لبيانات الكليب
    const questionIds = items.map((item: any) => item.questionId);
    const questions = await this.questionModel
      .find({ _id: { $in: questionIds }, listeningClipId: { $exists: true, $ne: null } })
      .select('listeningClipId')
      .populate('listeningClipId', 'title audioUrl audioKey teil')
      .lean();

    // استخراج الكليبات الفريدة مع توليد pre-signed URLs
    const clipMap = new Map<string, any>();
    for (const q of questions) {
      if (!q.listeningClipId) continue;
      const clip = q.listeningClipId as any;
      const clipId = clip._id?.toString() || clip.toString();
      if (!clipMap.has(clipId)) {
        const signedUrl = await this.getSignedAudioUrl(clip);
        clipMap.set(clipId, {
          listeningClipId: clipId,
          title: clip.title || '',
          audioUrl: signedUrl || clip.audioUrl || '',
          teil: clip.teil,
          questionCount: 0,
        });
      }
      clipMap.get(clipId)!.questionCount++;
    }

    return {
      sectionKey,
      clips: Array.from(clipMap.values()),
    };
  }
}
