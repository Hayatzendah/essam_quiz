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
import { GetGrammarQuestionsDto } from './dto/get-grammar-questions.dto';
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
    
    // استخراج examId من الـ dto قبل إنشاء السؤال
    const { examId, ...questionData } = dto;
    
    const doc = await this.model.create({
      ...questionData,
      status: dto.status ?? QuestionStatus.DRAFT,
      createdBy,
      // FREE_TEXT fields (إذا كانت موجودة)
      ...(dto.qType === QuestionType.FREE_TEXT && {
        ...(dto.sampleAnswer && { sampleAnswer: dto.sampleAnswer }),
        ...(dto.minWords !== undefined && { minWords: dto.minWords }),
        ...(dto.maxWords !== undefined && { maxWords: dto.maxWords }),
      }),
      // SPEAKING fields (إذا كانت موجودة)
      ...(dto.qType === QuestionType.SPEAKING && {
        ...(dto.modelAnswerText && { modelAnswerText: dto.modelAnswerText }),
        ...(dto.minSeconds !== undefined && { minSeconds: dto.minSeconds }),
        ...(dto.maxSeconds !== undefined && { maxSeconds: dto.maxSeconds }),
      }),
    });

    // إذا كان examId موجود، نربط السؤال بالامتحان
    if (examId) {
      await this.addQuestionToExam(examId, String(doc._id), dto.section);
    }

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
      ...(examId && { examId }), // إرجاع examId لو موجود
    };
  }

  async createBulkQuestions(questions: CreateQuestionDto[], createdBy?: string) {
    const results: Array<{ index: number; id: any; prompt: string; status: QuestionStatus }> = [];
    const errors: Array<{ index: number; prompt: string; error: string }> = [];

    for (let i = 0; i < questions.length; i++) {
      try {
        const question = questions[i];
        this.validateCreatePayload(question);
        
        // استخراج examId من الـ dto قبل إنشاء السؤال
        const { examId, ...questionData } = question;
        
        const doc = await this.model.create({
          ...questionData,
          status: question.status ?? QuestionStatus.DRAFT,
          createdBy,
          // FREE_TEXT fields (إذا كانت موجودة)
          ...(question.qType === QuestionType.FREE_TEXT && {
            ...(question.sampleAnswer && { sampleAnswer: question.sampleAnswer }),
            ...(question.minWords !== undefined && { minWords: question.minWords }),
            ...(question.maxWords !== undefined && { maxWords: question.maxWords }),
          }),
          // SPEAKING fields (إذا كانت موجودة)
          ...(question.qType === QuestionType.SPEAKING && {
            ...(question.modelAnswerText && { modelAnswerText: question.modelAnswerText }),
            ...(question.minSeconds !== undefined && { minSeconds: question.minSeconds }),
            ...(question.maxSeconds !== undefined && { maxSeconds: question.maxSeconds }),
          }),
        });

        // إذا كان examId موجود، نربط السؤال بالامتحان
        if (examId) {
          await this.addQuestionToExam(examId, String(doc._id), question.section);
        }

        results.push({
          index: i,
          id: doc._id,
          prompt: doc.prompt,
          status: doc.status,
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

    return {
      success: results.length,
      failed: errors.length,
      total: questions.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * إضافة سؤال لامتحان موجود
   * - يبحث عن section بالاسم ويضيف السؤال فيه
   * - لو Section مش موجود، ينشئ واحد جديد
   */
  async addQuestionToExam(examId: string, questionId: string, sectionName?: string) {
    const exam = await this.examModel.findById(examId).exec();
    if (!exam) {
      throw new NotFoundException(`Exam with ID ${examId} not found`);
    }

    // تنظيف sections من null أو قيم غريبة
    const cleanSections: any[] = Array.isArray(exam.sections)
      ? exam.sections.filter((sec: any) => !!sec && typeof sec === 'object')
      : [];

    // البحث عن سكشن بالاسم (إذا تم تحديده)
    let sectionIndex = -1;
    if (sectionName) {
      sectionIndex = cleanSections.findIndex(
        (sec: any) => sec.name === sectionName || sec.title === sectionName,
      );
    }

    if (sectionIndex === -1 && sectionName) {
      // لو مش موجود → نضيف سكشن جديد فيه السؤال
      cleanSections.push({
        name: sectionName,
        title: sectionName,
        items: [
          {
            questionId: new Types.ObjectId(questionId),
            points: 1,
          },
        ],
      });
    } else if (sectionIndex !== -1) {
      // لو موجود → نضيف السؤال في items
      const items = Array.isArray(cleanSections[sectionIndex].items)
        ? cleanSections[sectionIndex].items
        : [];
      items.push({
        questionId: new Types.ObjectId(questionId),
        points: 1,
      });
      cleanSections[sectionIndex].items = items;
    } else {
      // لو مفيش sectionName محدد، نضيف لأول section موجود
      if (cleanSections.length > 0) {
        const items = Array.isArray(cleanSections[0].items)
          ? cleanSections[0].items
          : [];
        items.push({
          questionId: new Types.ObjectId(questionId),
          points: 1,
        });
        cleanSections[0].items = items;
      } else {
        // لو مفيش sections خالص، ننشئ واحد default
        cleanSections.push({
          name: 'Default Section',
          title: 'Default Section',
          items: [
            {
              questionId: new Types.ObjectId(questionId),
              points: 1,
            },
          ],
        });
      }
    }

    // حفظ السكاشن المعدّلة في الامتحان
    exam.sections = cleanSections as any;
    await exam.save();

    return {
      success: true,
      examId: exam._id,
      questionId,
      sectionName: sectionName || cleanSections[0]?.name || 'Default Section',
    };
  }

  buildQuery(filters: QueryQuestionDto): FilterQuery<QuestionDocument> {
    const q: FilterQuery<QuestionDocument> = {};
    if (filters.provider) {
      // استخدام regex للبحث case-insensitive (لأن provider قد يكون "Goethe" أو "goethe" أو "GOETHE")
      const escapedProvider = filters.provider.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      q.provider = { $regex: `^${escapedProvider}$`, $options: 'i' };
    }
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
   * - فلترة حسب level و tags فقط
   * - فقط الأسئلة المنشورة
   * - لا يعتمد على exams أو sections
   */
  async getGrammarQuestions(dto: GetGrammarQuestionsDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    // بناء query للبحث عن أسئلة القواعد النحوية
    const query: FilterQuery<QuestionDocument> = {
      status: QuestionStatus.PUBLISHED, // فقط الأسئلة المنشورة
      level: dto.level,
    };

    // فلترة حسب tags - يجب أن يحتوي السؤال على كل الـ tags المطلوبة
    if (dto.tags && dto.tags.length > 0) {
      query.tags = { $all: dto.tags };
    }

    const [items, total] = await Promise.all([
      this.model.find(query).skip(skip).limit(limit).sort({ createdAt: 1 }).lean().exec(),
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
   * البحث عن أسئلة القواعد النحوية (Grammatik) - للتوافق مع الكود القديم
   * @deprecated Use getGrammarQuestions instead
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
  async createQuestionWithExam(dto: CreateQuestionWithExamDto, userId?: string) {
    const { examId, sectionTitle, section, points, text, prompt, type, qType, provider, skill, teilNumber, usageCategory, listeningClipId, answerKeyBoolean, ...questionData } = dto;
    
    // استخدام type إذا كان موجوداً، وإلا استخدام qType
    const questionType = type || qType;
    
    // استخدام text كحقل أساسي، و prompt كحقل اختياري
    const questionText = text;
    const questionPrompt = prompt ?? text;

    // 1) التحقق من listeningClipId لأسئلة Hören
    if (usageCategory === 'provider' && skill && skill.toLowerCase() === 'hoeren') {
      if (!listeningClipId) {
        throw new BadRequestException(
          'listeningClipId is required for Hören questions with provider usage category',
        );
      }
    }

    // 2) تأكيد وجود خيار صحيح (فقط لـ MCQ)
    let correctOption: any = null;
    if (questionType === 'mcq' && questionData.options) {
      correctOption = questionData.options.find((opt) => opt.isCorrect);
      if (!correctOption) {
        throw new BadRequestException(
          'At least one option must be marked as correct',
        );
      }
    }

    // 2.1) التحقق من answerKeyBoolean لأسئلة TRUE_FALSE
    if (questionType === QuestionType.TRUE_FALSE && typeof answerKeyBoolean !== 'boolean') {
      throw new BadRequestException(
        'answerKeyBoolean is required for true_false questions and must be a boolean',
      );
    }

    // 3) إنشاء السؤال
    const question = await this.model.create({
      prompt: questionPrompt,
      text: questionText,
      qType: questionType,
      options: questionData.options ? questionData.options.map((opt) => ({
        text: opt.text,
        isCorrect: opt.isCorrect || false,
      })) : undefined,
      correctAnswer: correctOption ? correctOption.text : undefined,
      // TRUE_FALSE answer
      ...(questionType === QuestionType.TRUE_FALSE && typeof answerKeyBoolean === 'boolean' && { answerKeyBoolean }),
      // FREE_TEXT fields
      ...(questionType === QuestionType.FREE_TEXT && {
        ...(questionData.sampleAnswer && { sampleAnswer: questionData.sampleAnswer }),
        ...(questionData.minWords !== undefined && { minWords: questionData.minWords }),
        ...(questionData.maxWords !== undefined && { maxWords: questionData.maxWords }),
      }),
      // SPEAKING fields
      ...(questionType === QuestionType.SPEAKING && {
        ...(questionData.modelAnswerText && { modelAnswerText: questionData.modelAnswerText }),
        ...(questionData.minSeconds !== undefined && { minSeconds: questionData.minSeconds }),
        ...(questionData.maxSeconds !== undefined && { maxSeconds: questionData.maxSeconds }),
      }),
      ...(questionData.explanation && { explanation: questionData.explanation }),
      ...(questionData.difficulty && { difficulty: questionData.difficulty as QuestionDifficulty }),
      level: questionData.level,
      status: questionData.status as QuestionStatus,
      tags: questionData.tags,
      provider: provider,
      section: section || sectionTitle,
      ...(questionData.audioUrl && { audioUrl: questionData.audioUrl }),
      ...(listeningClipId && { listeningClipId: new Types.ObjectId(listeningClipId) }),
      ...(questionData.media && { media: questionData.media }),
      // لو عندك createdBy/ownerId حطيه هنا
      // createdBy: userId ? new Types.ObjectId(userId) : undefined,
    });

    // 3) جلب الامتحان
    const exam = await this.examModel.findById(examId).exec();
    if (!exam) {
      // عشان ما نسيبش سؤال لوحده لو الامتحان مش موجود
      await this.model.findByIdAndDelete(question._id).catch(() => undefined);
      throw new NotFoundException('Exam not found');
    }

    // 4) تنظيف sections من null أو قيم غريبة
    const cleanSections: any[] = Array.isArray(exam.sections)
      ? exam.sections.filter((sec: any) => !!sec && typeof sec === 'object')
      : [];

    // 5) البحث عن سكشن بالاسم (استخدام section أو sectionTitle)
    const sectionName = section || sectionTitle;
    let sectionIndex = cleanSections.findIndex(
      (sec: any) => sec.name === sectionName || sec.title === sectionName,
    );

    if (sectionIndex === -1) {
      // 6) لو مش موجود → نضيف سكشن جديد فيه السؤال
      cleanSections.push({
        name: sectionName,
        title: sectionName, // للحفاظ على التوافق
        skill: skill,
        teilNumber: teilNumber,
        items: [
          {
            questionId: question._id,
            points: points ?? 1,
          },
        ],
      });
    } else {
      // 7) لو موجود → نضيف السؤال في items
      const items = Array.isArray(cleanSections[sectionIndex].items)
        ? cleanSections[sectionIndex].items
        : [];
      items.push({
        questionId: question._id,
        points: points ?? 1,
      });
      cleanSections[sectionIndex].items = items;
    }

    // 8) حفظ السكاشن المعدّلة في الامتحان
    exam.sections = cleanSections as any;
    await exam.save();

    // إرجاع النتيجة
    const questionDoc = question.toObject();
    const { __v, ...questionWithoutV } = questionDoc;

    return {
      message: 'Question created and added to exam',
      question: questionWithoutV,
      questionId: question._id,
      examId: exam._id,
      sectionTitle: sectionName,
      section: sectionName,
    };
  }
}
