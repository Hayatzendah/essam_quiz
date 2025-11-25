import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GrammarTopic, GrammarTopicDocument } from './schemas/grammar-topic.schema';
import { CreateGrammarTopicDto } from './dto/create-grammar-topic.dto';
import { UpdateGrammarTopicDto } from './dto/update-grammar-topic.dto';
import { AttemptsService } from '../../attempts/attempts.service';
import { QuestionsService } from '../../questions/questions.service';

@Injectable()
export class GrammarTopicsService {
  constructor(
    @InjectModel(GrammarTopic.name) private readonly model: Model<GrammarTopicDocument>,
    @Inject(forwardRef(() => AttemptsService))
    private readonly attemptsService: AttemptsService,
    private readonly questionsService: QuestionsService,
  ) {}

  /**
   * Find all grammar topics, optionally filtered by level
   */
  async findAll(filter: { level?: string }) {
    const query: any = {};
    if (filter.level) {
      query.level = filter.level;
    }

    const items = await this.model.find(query).sort({ level: 1, title: 1 }).lean().exec();

    return { items };
  }

  /**
   * Find a topic by slug (and optional level)
   */
  async findBySlug(slug: string, level?: string) {
    const query: any = { slug: slug.toLowerCase().trim() };
    if (level) {
      query.level = level;
    }

    const topic = await this.model.findOne(query).lean().exec();
    if (!topic) {
      throw new NotFoundException(
        `Grammar topic with slug "${slug}"${level ? ` and level "${level}"` : ''} not found`,
      );
    }

    return topic;
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
    });

    return topic.toObject();
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

    const updated = await this.model.findByIdAndUpdate(id, dto, { new: true }).lean().exec();
    if (!updated) {
      throw new NotFoundException(`Grammar topic with id "${id}" not found`);
    }

    return updated;
  }

  /**
   * بدء محاولة تمرين على grammar topic
   * - البحث عن grammar topic بالـ slug
   * - البحث عن أسئلة مرتبطة بـ topic tags
   * - إنشاء exam ديناميكي من هذه الأسئلة
   * - بدء attempt على هذا exam
   */
  async startPracticeAttempt(slug: string, level?: string, questionsCount?: number, user?: any) {
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
      limit: questionsCount ? questionsCount.toString() : '20',
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
      provider: 'Grammatik',
      sections: [
        {
          name: topic.title,
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
}
