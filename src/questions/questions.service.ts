import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { CreateQuestionDto } from './dto/create-question.dto';
import { QueryQuestionDto } from './dto/query-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { Question, QuestionDocument, QuestionStatus, QuestionType } from './schemas/question.schema';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectModel(Question.name) private readonly model: Model<QuestionDocument>,
  ) {}

  // التحقق الخاص (حسب نوع السؤال)
  private validateCreatePayload(dto: CreateQuestionDto) {
    if (dto.qType === QuestionType.MCQ) {
      const hasCorrect = (dto.options || []).some(o => o.isCorrect === true);
      if (!hasCorrect) throw new BadRequestException('MCQ must include at least one option with isCorrect=true');
    }
    if (dto.qType === QuestionType.TRUE_FALSE) {
      if (typeof dto.answerKeyBoolean !== 'boolean') {
        throw new BadRequestException('TRUE_FALSE requires boolean answerKeyBoolean');
      }
      if (dto.options && dto.options.length) {
        throw new BadRequestException('TRUE_FALSE should not include options');
      }
    }
    if (dto.qType === QuestionType.FILL) {
      const hasExact = dto.fillExact && dto.fillExact.trim().length > 0;
      const hasRegex = Array.isArray(dto.regexList) && dto.regexList.length > 0;
      if (!hasExact && !hasRegex) {
        throw new BadRequestException('FILL requires fillExact or regexList');
      }
    }
  }

  async createQuestion(dto: CreateQuestionDto, createdBy?: string) {
    this.validateCreatePayload(dto);
    const doc = await this.model.create({
      ...dto,
      status: dto.status ?? QuestionStatus.DRAFT,
      createdBy,
    });
    // رجّع أقل حاجة أساسية
    return {
      id: doc._id,
      prompt: doc.prompt,
      qType: doc.qType,
      status: doc.status,
      provider: doc.provider,
      level: doc.level,
      section: doc.section,
      tags: doc.tags,
      createdAt: (doc as any).createdAt,
    };
  }

  buildQuery(filters: QueryQuestionDto): FilterQuery<QuestionDocument> {
    const q: FilterQuery<QuestionDocument> = {};
    if (filters.provider) q.provider = filters.provider;
    if (filters.level) q.level = filters.level;
    if (filters.section) q.section = filters.section;
    if (filters.qType) q.qType = filters.qType;
    if (filters.status) q.status = filters.status;
    
    // قائمة جميع الولايات الألمانية
    const allStates = [
      'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen',
      'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen',
      'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen',
      'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen', 'NRW'
    ];
    
    // فلترة حسب الولاية (state) - للأسئلة العامة + أسئلة الولاية المحددة
    if (filters.state) {
      if (filters.tags) {
        // إذا كان tags موجود، نضيف state للقائمة
        const existingTags = filters.tags.split(',').map(s => s.trim()).filter(Boolean);
        q.tags = { $in: [...existingTags, filters.state] };
      } else {
        // للأسئلة العامة (بدون tags للولايات) + أسئلة الولاية المحددة
        q.$or = [
          { tags: { $nin: allStates } }, // أسئلة عامة (ليس لها tag للولاية)
          { tags: filters.state } // أسئلة الولاية المحددة
        ];
      }
    } else if (filters.tags) {
      // فلترة حسب tags فقط (بدون state)
      q.tags = { $in: filters.tags.split(',').map(s => s.trim()).filter(Boolean) };
    }
    
    if (filters.text) q.$text = { $search: filters.text };
    return q;
  }

  async findQuestions(filters: QueryQuestionDto) {
    const page = Math.max(parseInt(filters.page ?? '1', 10), 1);
    const limit = Math.max(parseInt(filters.limit ?? '10', 10), 1);
    const skip = (page - 1) * limit;

    const query = this.buildQuery(filters);
    const [items, total] = await Promise.all([
      this.model.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean().exec(),
      this.model.countDocuments(query),
    ]);

    return {
      page, limit, total, items,
    };
  }

  /**
   * للطلاب: جلب الأسئلة المنشورة فقط
   * - فلترة تلقائية: status = 'published'
   * - دعم فلترة حسب الولاية (state): أسئلة عامة + أسئلة الولاية المحددة
   */
  async findPublishedForStudent(filters: QueryQuestionDto) {
    const page = Math.max(parseInt(filters.page ?? '1', 10), 1);
    const limit = Math.max(parseInt(filters.limit ?? '20', 10), 1);
    const skip = (page - 1) * limit;

    // بناء query مع فرض status = published
    const query = this.buildQuery({
      ...filters,
      status: QuestionStatus.PUBLISHED, // فرض المنشور فقط
    });

    const [items, total] = await Promise.all([
      this.model.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean().exec(),
      this.model.countDocuments(query),
    ]);

    return {
      page, limit, total, items,
    };
  }

  async findById(id: string) {
    const question = await this.model.findById(id).lean().exec();
    if (!question) {
      throw new NotFoundException('Question not found');
    }
    return question;
  }

  async updateQuestion(id: string, dto: UpdateQuestionDto) {
    // لا نسمح بتغيير qType
    if (typeof (dto as any).qType !== 'undefined') {
      throw new BadRequestException('qType cannot be updated');
    }

    const updated = await this.model.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!updated) throw new NotFoundException('Question not found');
    return updated;
  }

  /**
   * سياسة الحذف:
   * - افتراضيًا: soft delete عبر تغيير الحالة إلى archived (أفضل للنزاهة لو السؤال مُستخدم).
   * - تفعيل الحذف الفعلي عبر hard=true (لو ضامنة إنه غير مستخدم).
   */
  async removeQuestion(id: string, hard = false) {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Question not found');

    if (!hard) {
      if (doc.status === QuestionStatus.PUBLISHED) {
        // ممكن تمنعي الأرشفة من المنشور لو مستخدم في امتحانات—هنا بنسمح بالأرشفة فقط
      }
      doc.status = QuestionStatus.ARCHIVED;
      await doc.save();
      return { archived: true };
    }

    await this.model.deleteOne({ _id: id }).exec();
    return { deleted: true };
  }
}

