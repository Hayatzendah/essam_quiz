import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GrammarTopic, GrammarTopicDocument } from './schemas/grammar-topic.schema';
import { Exam, ExamDocument } from '../../exams/schemas/exam.schema';
import { CreateGrammarTopicDto } from './dto/create-grammar-topic.dto';
import { UpdateGrammarTopicDto } from './dto/update-grammar-topic.dto';
import { StartGrammarExerciseDto } from './dto/start-grammar-exercise.dto';
import { LinkExamDto } from './dto/link-exam.dto';
import { AttemptsService } from '../../attempts/attempts.service';
import { QuestionsService } from '../../questions/questions.service';
import { ProviderEnum } from '../../common/enums/provider.enum';

@Injectable()
export class GrammarTopicsService {
  private readonly logger = new Logger(GrammarTopicsService.name);

  constructor(
    @InjectModel(GrammarTopic.name) private readonly model: Model<GrammarTopicDocument>,
    @InjectModel(Exam.name) private readonly examModel: Model<ExamDocument>,
    @Inject(forwardRef(() => AttemptsService))
    private readonly attemptsService: AttemptsService,
    @Inject(forwardRef(() => QuestionsService))
    private readonly questionsService: QuestionsService,
  ) {}

  /**
   * Helper method to map topic document to response format
   */
  private mapToResponse(topic: any): any {
    return {
      ...topic,
      _id: topic._id?.toString() || topic.id?.toString() || topic._id,
      examId: topic.examId
        ? typeof topic.examId === 'object' && topic.examId.toString
          ? topic.examId.toString()
          : topic.examId
        : null,
      sectionTitle: topic.sectionTitle ?? null,
    };
  }

  /**
   * Find all grammar topics, optionally filtered by level
   */
  async findAll(filter: { level?: string }) {
    const query: any = {};
    if (filter.level) {
      query.level = filter.level;
    }

    const items = await this.model.find(query).sort({ level: 1, title: 1 }).lean().exec();

    return {
      items: items.map((item) => this.mapToResponse(item)),
    };
  }

  /**
   * Find a topic by slug (and optional level)
   */
  async findBySlug(slug: string, level?: string) {
    const query: any = { slug: slug.toLowerCase().trim() };
    if (level) {
      query.level = level;
    }

    const topic = await this.model.findOne(query).exec();
    if (!topic) {
      throw new NotFoundException(
        `Grammar topic with slug "${slug}"${level ? ` and level "${level}"` : ''} not found`,
      );
    }

    // إذا كان examId موجوداً، إرجاعه مباشرة
    if (topic.examId) {
      return this.mapToResponse(topic);
    }

    // محاولة البحث عن exam مرتبط بالموضوع تلقائياً
    // البحث عن exam يحتوي على grammarTopicId يطابق topic._id
    const exam = await this.examModel
      .findOne({
        grammarTopicId: topic._id,
        examCategory: 'grammar_exam',
      })
      .lean()
      .exec();

    if (exam) {
      // ربط الموضوع بالامتحان تلقائياً
      topic.examId = exam._id;
      
      // البحث عن section title
      let sectionTitle: string | null = null;
      if (exam.sections && Array.isArray(exam.sections) && exam.sections.length > 0) {
        const firstSection = exam.sections.find((sec: any) => sec && typeof sec === 'object');
        if (firstSection) {
          sectionTitle = firstSection.title || firstSection.name || null;
        }
      }
      
      if (sectionTitle) {
        topic.sectionTitle = sectionTitle;
      }
      
      await topic.save();
      this.logger.log(`Auto-linked topic ${slug} (${level}) to exam ${exam._id}`);
    }

    return this.mapToResponse(topic);
  }

  /**
   * Create a new grammar topic
   */
  async create(dto: CreateGrammarTopicDto) {
    // Generate slug from title if not provided
    let slug = dto.slug;
    if (!slug) {
      slug = dto.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    } else {
      slug = slug.toLowerCase().trim();
    }

    // Check if slug already exists for this level
    const existing = await this.model.findOne({ slug, level: dto.level }).exec();
    if (existing) {
      throw new BadRequestException(
        `A grammar topic with slug "${slug}" already exists for level "${dto.level}"`,
      );
    }

    const topic = await this.model.create({
      ...dto,
      slug,
      ...(dto.examId && { examId: new Types.ObjectId(dto.examId) }),
    });

    return this.mapToResponse(topic.toObject());
  }

  /**
   * Update an existing grammar topic by id
   */
  async update(id: string, dto: UpdateGrammarTopicDto) {
    // Get the current topic to check for conflicts
    const currentTopic = await this.model.findById(id).exec();
    if (!currentTopic) {
      throw new NotFoundException(`Grammar topic with id "${id}" not found`);
    }

    // If slug is being updated, normalize it
    if (dto.slug) {
      dto.slug = dto.slug.toLowerCase().trim();

      // Determine the level to check (use new level if provided, otherwise current level)
      const levelToCheck = dto.level || currentTopic.level;

      // Check if the new slug conflicts with another topic at the same level
      const existing = await this.model
        .findOne({
          slug: dto.slug,
          level: levelToCheck,
          _id: { $ne: id },
        })
        .exec();

      if (existing) {
        throw new BadRequestException(
          `A grammar topic with slug "${dto.slug}" already exists for level "${levelToCheck}"`,
        );
      }
    }

    // Prepare update data with ObjectId conversion for examId
    const updateData: any = { ...dto };
    if (dto.examId) {
      updateData.examId = new Types.ObjectId(dto.examId);
    }

    const updated = await this.model.findByIdAndUpdate(id, updateData, { new: true }).lean().exec();
    if (!updated) {
      throw new NotFoundException(`Grammar topic with id "${id}" not found`);
    }

    return this.mapToResponse(updated);
  }

  /**
   * بدء محاولة تمرين على grammar topic
   * - البحث عن grammar topic بالـ slug
   * - البحث عن أسئلة مرتبطة بـ topic tags
   * - إنشاء exam ديناميكي من هذه الأسئلة
   * - بدء attempt على هذا exam
   */
  async startPracticeAttempt(slug: string, dto: StartGrammarExerciseDto, user?: any) {
    const { level, questionsCount } = dto;

    // 1. البحث عن grammar topic
    const topic = await this.findBySlug(slug, level);

    // 2. البحث عن أسئلة مرتبطة بـ topic tags
    const tags = topic.tags || [];
    if (tags.length === 0) {
      throw new BadRequestException(
        `Grammar topic "${topic.title}" has no tags. Cannot find related questions.`,
      );
    }

    // 3. البحث عن أسئلة القواعد النحوية المرتبطة بالموضوع
    const questionsResult = await this.questionsService.findGrammar({
      level: topic.level as 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | undefined,
      tags: tags,
      limit: questionsCount.toString(),
      page: '1',
    });

    if (!questionsResult.items || questionsResult.items.length === 0) {
      throw new BadRequestException({
        code: 'NO_QUESTIONS_FOUND',
        message: `No questions found for grammar topic "${topic.title}" with tags: ${tags.join(', ')}`,
        topic: topic.title,
        level: topic.level,
        tags: tags,
      });
    }

    // 4. إنشاء exam ديناميكي من هذه الأسئلة
    const examDto = {
      title: `تمرين: ${topic.title} - ${topic.level}`,
      level: topic.level,
      provider: ProviderEnum.GRAMMATIK,
      sections: [
        {
          name: topic.title, // للتوافق مع الكود القديم (مع items)
          items: questionsResult.items.map((q: any) => ({
            questionId: q._id || q.id,
            points: 1,
          })),
        },
      ],
      randomizeQuestions: true,
      attemptLimit: 0, // غير محدود
      timeLimitMin: 0, // غير محدود
    };

    // 5. بدء attempt على هذا exam
    return this.attemptsService.startPracticeAttempt(examDto, user);
  }

  /**
   * ربط Grammar Topic مع Exam
   * - التحقق من وجود الـ exam
   * - ربط الـ topic مع الـ exam
   * - إرجاع success message
   */
  async linkExam(identifier: string, dto: LinkExamDto, level?: string) {
    // 1. البحث عن grammar topic (يدعم كلاً من slug و topicId)
    let topic: GrammarTopicDocument | null = null;
    
    // محاولة البحث بالـ ID أولاً (إذا كان ObjectId صحيح)
    if (Types.ObjectId.isValid(identifier)) {
      topic = await this.model.findById(identifier).exec();
    }
    
    // إذا لم يُعثر عليه بالـ ID، البحث بالـ slug
    if (!topic) {
      const query: any = { slug: identifier.toLowerCase().trim() };
      if (level) {
        query.level = level;
      }
      topic = await this.model.findOne(query).exec();
    }

    if (!topic) {
      throw new NotFoundException(
        `Grammar topic with identifier "${identifier}"${level ? ` and level "${level}"` : ''} not found`,
      );
    }

    // 2. التحقق من وجود الـ exam
    const examId = new Types.ObjectId(dto.examId);
    const exam = await this.examModel.findById(examId).lean().exec();

    if (!exam) {
      throw new NotFoundException(`Exam with ID "${dto.examId}" not found`);
    }

    // 3. البحث عن section title من الـ exam (أول section أو null)
    let sectionTitle: string | null = null;
    if (exam.sections && Array.isArray(exam.sections) && exam.sections.length > 0) {
      const firstSection = exam.sections.find((sec: any) => sec && typeof sec === 'object');
      if (firstSection) {
        sectionTitle = firstSection.title || firstSection.name || null;
      }
    }

    // 4. تحديث الـ topic بربطه مع الـ exam
    topic.examId = examId;
    if (sectionTitle) {
      topic.sectionTitle = sectionTitle;
    }
    await topic.save();

    return {
      success: true,
      topicId: (topic._id as any)?.toString() || String(topic._id),
      examId: dto.examId,
      sectionTitle: sectionTitle || undefined,
    };
  }

  /**
   * ربط امتحان بموضوع قواعد
   * @param level مستوى الموضوع (A1, A2, B1, B2, C1)
   * @param slug slug الموضوع (مثل: "dativ")
   * @param examId معرف الامتحان
   */
  async attachExamToTopic(level: string, slug: string, examId: string) {
    // 1. البحث عن الموضوع
    const topic = await this.model.findOne({
      level,
      slug: slug.toLowerCase().trim(),
    }).exec();

    if (!topic) {
      this.logger.warn(
        `No grammar topic found for level=${level}, slug=${slug} when attaching exam ${examId}`,
      );
      return null;
    }

    // 2. جلب الامتحان للحصول على sectionTitle
    const exam = await this.examModel.findById(examId).lean().exec();
    if (!exam) {
      this.logger.warn(`Exam with ID "${examId}" not found when attaching to topic`);
      return null;
    }

    // 3. البحث عن section title من الـ exam (أول section أو null)
    let sectionTitle: string | null = null;
    if (exam.sections && Array.isArray(exam.sections) && exam.sections.length > 0) {
      const firstSection = exam.sections.find((sec: any) => sec && typeof sec === 'object');
      if (firstSection) {
        sectionTitle = firstSection.title || firstSection.name || null;
      }
    }

    // 4. تحديث الـ topic بربطه مع الـ exam و sectionTitle
    topic.examId = new Types.ObjectId(examId);
    if (sectionTitle) {
      topic.sectionTitle = sectionTitle;
    }
    await topic.save();

    return topic;
  }
}
