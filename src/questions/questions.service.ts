import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { CreateQuestionDto } from './dto/create-question.dto';
import { QueryQuestionDto } from './dto/query-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { FindVocabDto } from './dto/find-vocab.dto';
import {
  Question,
  QuestionDocument,
  QuestionStatus,
  QuestionType,
  QuestionDifficulty,
} from './schemas/question.schema';
import { CreateQuestionWithExamDto } from './dto/create-question-with-exam.dto';
import { Exam, ExamDocument } from '../exams/schemas/exam.schema';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectModel(Question.name) private readonly model: Model<QuestionDocument>,
    @InjectModel(Exam.name) private readonly examModel: Model<ExamDocument>,
  ) {}

  // التحقق الخاص (حسب نوع السؤال)
  private validateCreatePayload(dto: CreateQuestionDto) {
    if (dto.qType === QuestionType.MCQ) {
      const hasCorrect = (dto.options || []).some((o) => o.isCorrect === true);
      if (!hasCorrect)
        throw new BadRequestException('MCQ must include at least one option with isCorrect=true');
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

    // فلترة حسب الولاية (state) - للأسئلة العامة + أسئلة الولاية المحددة
    if (filters.state) {
      if (filters.tags) {
        // إذا كان tags موجود، نضيف state للقائمة
        const existingTags = filters.tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        q.tags = { $in: [...existingTags, filters.state] };
      } else {
        // للأسئلة العامة (بدون tags للولايات) + أسئلة الولاية المحددة
        q.$or = [
          { tags: { $nin: allStates } }, // أسئلة عامة (ليس لها tag للولاية)
          { tags: filters.state }, // أسئلة الولاية المحددة
        ];
      }
    } else if (filters.tags) {
      // فلترة حسب tags فقط (بدون state)
      q.tags = {
        $in: filters.tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };
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
      page,
      limit,
      total,
      items,
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
      page,
      limit,
      total,
      items,
    };
  }

  async findById(id: string) {
    // تنظيف الـ ID من أي رموز غير صالحة (< > أو مسافات)
    const cleanId = id.trim().replace(/[<>]/g, '');
    
    if (!Types.ObjectId.isValid(cleanId)) {
      throw new BadRequestException(
        `Invalid question ID format: "${id}". Expected a valid MongoDB ObjectId (24 hex characters). Cleaned ID: "${cleanId}"`,
      );
    }
    
    const question = await this.model.findById(cleanId).lean().exec();
    if (!question) {
      throw new NotFoundException('Question not found');
    }
    return question;
  }

  async updateQuestion(id: string, dto: UpdateQuestionDto) {
    // لا نسمح بتغيير qType - نتجاهله إذا كان موجوداً في الـ payload
    const { qType, ...updateData } = dto as any;

    // إذا كان qType موجود في الـ payload، نتحقق من أنه نفس القيمة الحالية
    if (typeof qType !== 'undefined') {
      const existing = await this.model.findById(id).lean().exec();
      if (!existing) throw new NotFoundException('Question not found');

      // إذا كان qType مختلف عن القيمة الحالية، نرفض التحديث
      if (qType !== existing.qType) {
        throw new BadRequestException('qType cannot be updated');
      }
      // إذا كان نفس القيمة، نتجاهله فقط (لا نحدثه في updateData)
    }

    // تطبيق التحديث (بدون qType)
    const updated = await this.model.findByIdAndUpdate(id, updateData, { new: true }).exec();
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

  /**
   * البحث عن أسئلة المفردات (Wortschatz)
   * - section = "wortschatz"
   * - فلترة حسب level, tags, search
   */
  async findVocab(dto: FindVocabDto) {
    const page = Math.max(parseInt(dto.page ?? '1', 10), 1);
    const limit = Math.max(parseInt(dto.limit ?? '20', 10), 1);
    const skip = (page - 1) * limit;

    // بناء query للبحث عن أسئلة المفردات
    const query: FilterQuery<QuestionDocument> = {
      section: 'wortschatz',
      status: QuestionStatus.PUBLISHED, // فقط الأسئلة المنشورة
    };

    // فلترة حسب level
    if (dto.level) {
      query.level = dto.level;
    }

    // فلترة حسب tags
    if (dto.tags && dto.tags.length > 0) {
      query.tags = { $in: dto.tags };
    }

    // بحث نصي في prompt
    if (dto.search) {
      // استخدام regex للبحث (case-insensitive)
      query.prompt = { $regex: dto.search, $options: 'i' };
    }

    const [items, total] = await Promise.all([
      this.model.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean().exec(),
      this.model.countDocuments(query),
    ]);

    return {
      page,
      limit,
      total,
      items,
    };
  }

  /**
   * البحث عن أسئلة القواعد النحوية (Grammatik)
   * - section = "grammar"
   * - فلترة حسب level, tags, search
   */
  async findGrammar(dto: FindVocabDto) {
    const page = Math.max(parseInt(dto.page ?? '1', 10), 1);
    const limit = Math.max(parseInt(dto.limit ?? '20', 10), 1);
    const skip = (page - 1) * limit;

    // بناء query للبحث عن أسئلة القواعد النحوية
    const query: FilterQuery<QuestionDocument> = {
      section: 'grammar',
      status: QuestionStatus.PUBLISHED, // فقط الأسئلة المنشورة
    };

    // فلترة حسب level
    if (dto.level) {
      query.level = dto.level;
    }

    // فلترة حسب tags
    if (dto.tags && dto.tags.length > 0) {
      query.tags = { $in: dto.tags };
    }

    // بحث نصي في prompt
    if (dto.search) {
      // استخدام regex للبحث (case-insensitive)
      query.prompt = { $regex: dto.search, $options: 'i' };
    }

    const [items, total] = await Promise.all([
      this.model.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean().exec(),
      this.model.countDocuments(query),
    ]);

    return {
      page,
      limit,
      total,
      items,
    };
  }

  /**
   * إنشاء سؤال جديد وربطه بامتحان
   * - ينشئ Question جديد
   * - يحدد correctAnswer تلقائياً من أول option مع isCorrect = true
   * - يربط السؤال بامتحان في section محدد
   */
  async createQuestionWithExam(dto: CreateQuestionWithExamDto) {
    // 1) التحقق من وجود option صحيح
    const correctOption = dto.options.find((opt) => opt.isCorrect === true);
    if (!correctOption) {
      throw new BadRequestException(
        'At least one option must have isCorrect = true',
      );
    }

    // 2) تحديد correctAnswer تلقائياً
    const correctAnswer = correctOption.text;

    // 3) تحويل examId إلى ObjectId
    if (!Types.ObjectId.isValid(dto.examId)) {
      throw new BadRequestException('Invalid examId format');
    }
    const examObjectId = new Types.ObjectId(dto.examId);

    // 4) جلب الامتحان
    const exam = await this.examModel.findById(examObjectId).exec();
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // 5) تأمين sections (إزالة nulls + التأكد إنها Array)
    if (!Array.isArray(exam.sections)) {
      exam.sections = [];
    } else {
      // شيل أي null أو قيم فاضية من الداتا القديمة
      exam.sections = exam.sections.filter((sec: any) => sec !== null && sec !== undefined);
    }

    // 6) إنشاء السؤال
    const questionData = {
      text: dto.text,
      prompt: dto.text, // للحفاظ على التوافق مع الحقول الموجودة
      qType: QuestionType.MCQ,
      options: dto.options.map((opt) => ({
        text: opt.text,
        isCorrect: opt.isCorrect || false,
      })),
      correctAnswer,
      explanation: dto.explanation,
      difficulty: dto.difficulty as QuestionDifficulty,
      level: dto.level,
      status: dto.status as QuestionStatus,
      tags: dto.tags,
    };

    const createdQuestion = await this.model.create(questionData);

    // 7) ربط السؤال بالامتحان
    const points = dto.points ?? 1;
    const sectionItem = {
      questionId: createdQuestion._id,
      points,
    };

    // 8) البحث عن section بالاسم (name في الـ schema)
    let section: any = exam.sections.find(
      (sec: any) => sec && sec.name === dto.sectionTitle,
    );

    // 9) لو مش موجود → نضيف سكشن جديد
    if (!section) {
      section = {
        name: dto.sectionTitle,
        items: [],
      };
      exam.sections.push(section);
    }

    // 10) تأمين items
    if (!Array.isArray(section.items)) {
      section.items = [];
    }

    // 11) إضافة السؤال للسكشن
    section.items.push(sectionItem);

    // 12) حفظ التعديلات على الامتحان
    await exam.save();

    // 13) حساب عدد الأسئلة في السكشن بعد الإضافة
    const updatedSection = exam.sections.find(
      (sec: any) => sec && sec.name === dto.sectionTitle,
    );
    const questionsCount = updatedSection?.items?.length || 0;

    // 14) إرجاع النتيجة
    const questionDoc = createdQuestion.toObject();
    const { __v, ...questionWithoutV } = questionDoc;

    return {
      question: questionWithoutV,
      examId: dto.examId,
      sectionTitle: dto.sectionTitle,
      questionsCountInSection: questionsCount,
    };
  }
}
