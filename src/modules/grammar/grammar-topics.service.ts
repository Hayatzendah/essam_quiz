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
import { ContentBlockType, ExerciseQuestionType } from './schemas/content-block.schema';

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
   * Validate contentBlocks according to their type
   */
  private validateContentBlocks(contentBlocks?: any[]): void {
    if (!contentBlocks || contentBlocks.length === 0) {
      return;
    }

    for (const block of contentBlocks) {
      if (!block.id || typeof block.id !== 'string') {
        throw new BadRequestException('Each contentBlock must have a valid id (string)');
      }

      if (!block.type || !Object.values(ContentBlockType).includes(block.type)) {
        throw new BadRequestException(
          `Invalid contentBlock type: ${block.type}. Must be one of: ${Object.values(ContentBlockType).join(', ')}`,
        );
      }

      if (!block.data || typeof block.data !== 'object') {
        throw new BadRequestException('Each contentBlock must have a valid data object');
      }

      // Validate data according to type
      switch (block.type) {
        case ContentBlockType.INTRO:
          if (!block.data.text || typeof block.data.text !== 'string') {
            throw new BadRequestException('Intro block must have data.text (string)');
          }
          break;

        case ContentBlockType.IMAGE:
          if (!block.data.url || typeof block.data.url !== 'string') {
            throw new BadRequestException('Image block must have data.url (string)');
          }
          break;

        case ContentBlockType.TABLE:
          if (!Array.isArray(block.data.headers) || !Array.isArray(block.data.rows)) {
            throw new BadRequestException('Table block must have data.headers (array) and data.rows (array)');
          }
          break;

        case ContentBlockType.YOUTUBE:
          if (!block.data.videoId || typeof block.data.videoId !== 'string') {
            throw new BadRequestException('Youtube block must have data.videoId (string)');
          }
          break;

        case ContentBlockType.EXERCISE:
          // التحقق من وجود أسئلة
          if (!Array.isArray(block.data.questions) || block.data.questions.length === 0) {
            throw new BadRequestException('Exercise block must have data.questions (non-empty array)');
          }
          // التحقق من صحة كل سؤال
          for (const q of block.data.questions) {
            if (!q.prompt || typeof q.prompt !== 'string') {
              throw new BadRequestException('Each exercise question must have a prompt (string)');
            }
            if (!q.type || !Object.values(ExerciseQuestionType).includes(q.type)) {
              throw new BadRequestException(
                `Invalid question type: ${q.type}. Must be one of: ${Object.values(ExerciseQuestionType).join(', ')}`,
              );
            }
            if (!q.correctAnswer || typeof q.correctAnswer !== 'string') {
              throw new BadRequestException('Each exercise question must have a correctAnswer (string)');
            }
            // أسئلة الاختيار من متعدد تحتاج خيارات
            if (q.type === ExerciseQuestionType.MULTIPLE_CHOICE) {
              if (!Array.isArray(q.options) || q.options.length < 2) {
                throw new BadRequestException('Multiple choice questions must have at least 2 options');
              }
            }
            // أسئلة ترتيب الكلمات تحتاج كلمات
            if (q.type === ExerciseQuestionType.WORD_ORDER) {
              if (!Array.isArray(q.words) || q.words.length < 2) {
                throw new BadRequestException('Word order questions must have at least 2 words');
              }
              if (!q.words.every((w: any) => typeof w === 'string' && w.trim().length > 0)) {
                throw new BadRequestException('Word order questions words must be non-empty strings');
              }
            }
          }
          break;

        default:
          throw new BadRequestException(`Unknown contentBlock type: ${block.type}`);
      }
    }
  }

  /**
   * Generate unique IDs for contentBlocks if missing
   */
  private ensureContentBlockIds(contentBlocks?: any[]): any[] {
    if (!contentBlocks || contentBlocks.length === 0) {
      return [];
    }

    return contentBlocks.map((block, index) => ({
      ...block,
      id: block.id || `block-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
    }));
  }

  /**
   * Helper method to map topic document to response format
   */
  private mapToResponse(topic: any): any {
    // Convert Mongoose document to plain object if needed
    const plainTopic = topic.toObject ? topic.toObject() : topic;
    
    return {
      ...plainTopic,
      _id: plainTopic._id?.toString() || plainTopic.id?.toString() || plainTopic._id,
      examId: plainTopic.examId
        ? typeof plainTopic.examId === 'object' && plainTopic.examId.toString
          ? plainTopic.examId.toString()
          : plainTopic.examId
        : null,
      sectionTitle: plainTopic.sectionTitle ?? null,
      // Ensure contentBlocks are returned in the same order
      contentBlocks: plainTopic.contentBlocks || [],
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

    const items = await this.model.find(query).sort({ level: 1, position: 1, title: 1 }).lean().exec();

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
    // 1. البحث عن exam يحتوي على grammarTopicId يطابق topic._id
    let exam = await this.examModel
      .findOne({
        grammarTopicId: topic._id,
        examCategory: 'grammar_exam',
      })
      .lean()
      .exec();

    // 2. إذا لم يُوجد، البحث عن exam بنفس الـ level و grammar_exam category
    if (!exam && level) {
      exam = await this.examModel
        .findOne({
          examCategory: 'grammar_exam',
          level: level,
          grammarLevel: level,
        })
        .sort({ createdAt: -1 }) // أحدث exam
        .lean()
        .exec();
    }

    // 3. إذا لم يُوجد، البحث عن أي exam من نوع grammar_exam بنفس الـ level
    if (!exam && level) {
      exam = await this.examModel
        .findOne({
          examCategory: 'grammar_exam',
          level: level,
        })
        .sort({ createdAt: -1 }) // أحدث exam
        .lean()
        .exec();
    }

    if (exam) {
      // ربط الموضوع بالامتحان تلقائياً
      topic.examId = (exam as any)._id;
      
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
    } else {
      this.logger.warn(`No exam found for topic ${slug} (${level}) - examId will remain null`);
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

    // Validate contentBlocks if provided
    if (dto.contentBlocks) {
      this.validateContentBlocks(dto.contentBlocks);
      dto.contentBlocks = this.ensureContentBlockIds(dto.contentBlocks);
    }

    const topic = await this.model.create({
      ...dto,
      slug,
      ...(dto.examId && { examId: new Types.ObjectId(dto.examId) }),
      // Ensure contentBlocks are saved in the same order
      contentBlocks: dto.contentBlocks || [],
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

    // Validate contentBlocks if provided
    if (dto.contentBlocks) {
      this.validateContentBlocks(dto.contentBlocks);
      dto.contentBlocks = this.ensureContentBlockIds(dto.contentBlocks);
    }

    // Prepare update data with ObjectId conversion for examId
    const updateData: any = { ...dto };
    if (dto.examId) {
      updateData.examId = new Types.ObjectId(dto.examId);
    }
    // Ensure contentBlocks are saved in the same order
    if (dto.contentBlocks !== undefined) {
      updateData.contentBlocks = dto.contentBlocks;
    }

    const updated = await this.model.findByIdAndUpdate(id, updateData, { new: true }).lean().exec();
    if (!updated) {
      throw new NotFoundException(`Grammar topic with id "${id}" not found`);
    }

    return this.mapToResponse(updated);
  }

  /**
   * Delete a grammar topic by id
   */
  async remove(id: string) {
    const topic = await this.model.findById(id).exec();
    if (!topic) {
      throw new NotFoundException(`Grammar topic with id "${id}" not found`);
    }
    await this.model.findByIdAndDelete(id).exec();
    this.logger.log(`Grammar topic deleted: id=${id}, title=${(topic as any).title}`);
    return { success: true, message: 'Topic deleted successfully' };
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

  /**
   * إعادة ترتيب مواضيع القواعد
   * @param topicIds مصفوفة معرفات المواضيع بالترتيب المطلوب
   */
  async reorderTopics(topicIds: string[]) {
    const bulkOps = topicIds.map((id, index) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(id) },
        update: { $set: { position: index } },
      },
    }));

    await this.model.bulkWrite(bulkOps);

    return {
      success: true,
      message: 'Topics reordered successfully',
      count: topicIds.length,
    };
  }
}
