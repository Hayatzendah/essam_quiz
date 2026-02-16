import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
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
import { LearnGeneralQuestionsDto, LearnStateQuestionsDto } from './dto/learn-questions.dto';
import { Exam, ExamDocument } from '../exams/schemas/exam.schema';
import { GrammarTopic, GrammarTopicDocument } from '../modules/grammar/schemas/grammar-topic.schema';
import { GrammarTopicsService } from '../modules/grammar/grammar-topics.service';
import { Inject, forwardRef } from '@nestjs/common';
import { ProviderEnum } from '../common/enums/provider.enum';
import { normalizeProvider } from '../common/utils/provider-normalizer.util';
import { normalizeSkill } from '../common/utils/skill-normalizer.util';

@Injectable()
export class QuestionsService {
  private readonly logger = new Logger(QuestionsService.name);

  constructor(
    @InjectModel(Question.name) private readonly model: Model<QuestionDocument>,
    @InjectModel(Exam.name) private readonly examModel: Model<ExamDocument>,
    @InjectModel(GrammarTopic.name) private readonly grammarTopicModel: Model<GrammarTopicDocument>,
    @Inject(forwardRef(() => GrammarTopicsService))
    private readonly grammarTopicsService: GrammarTopicsService,
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
      // fillExact يمكن أن يكون string أو array
      const hasExact = 
        (typeof dto.fillExact === 'string' && dto.fillExact.trim().length > 0) ||
        (Array.isArray(dto.fillExact) && dto.fillExact.length > 0 && dto.fillExact.some((item: any) => item && String(item).trim().length > 0));
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
    
    // Log للتحقق من answerKeyMatch
    if (dto.qType === QuestionType.MATCH) {
      this.logger.debug(`createQuestion: Match question - answerKeyMatch from DTO: ${JSON.stringify(dto.answerKeyMatch)}`);
    }
    
    // إزالة answerKeyMatch من questionData إذا كان موجودًا لتجنب التعارض
    const { answerKeyMatch: _, answerKeyReorder: __, ...restQuestionData } = questionData;
    
    const doc = await this.model.create({
      ...restQuestionData,
      status: dto.status ?? QuestionStatus.PUBLISHED,
      createdBy,
      // MATCH fields
      ...(dto.qType === QuestionType.MATCH && dto.answerKeyMatch && Array.isArray(dto.answerKeyMatch) && { answerKeyMatch: dto.answerKeyMatch }),
      // REORDER fields
      ...(dto.qType === QuestionType.REORDER && dto.answerKeyReorder && Array.isArray(dto.answerKeyReorder) && { answerKeyReorder: dto.answerKeyReorder }),
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
      // INTERACTIVE_TEXT fields (إذا كانت موجودة)
      ...(dto.qType === QuestionType.INTERACTIVE_TEXT && {
        ...(dto.interactiveText && { interactiveText: dto.interactiveText }),
        // استخدام interactiveText إذا كان موجوداً، وإلا text
        ...((dto.interactiveText || dto.text) && { text: dto.interactiveText || dto.text }),
        ...(dto.interactiveBlanks && Array.isArray(dto.interactiveBlanks) && dto.interactiveBlanks.length > 0 && {
          interactiveBlanks: dto.interactiveBlanks.map((blank: any) => {
            // تحويل select إلى dropdown للتوحيد
            const type = blank.type === 'select' ? 'dropdown' : blank.type;
            // استخدام options إذا كان موجوداً، وإلا choices
            const options = blank.options || blank.choices;
            const choices = blank.choices || blank.options;
            return {
              ...blank,
              type,
              options,
              choices, // للتوافق مع الكود القديم
            };
          }),
        }),
        ...(dto.interactiveReorder && { interactiveReorder: dto.interactiveReorder }),
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
      // إرجاع answerKeyMatch لأسئلة Match
      ...(doc.qType === QuestionType.MATCH && doc.answerKeyMatch && { answerKeyMatch: doc.answerKeyMatch }),
      // إرجاع answerKeyReorder لأسئلة Reorder
      ...(doc.qType === QuestionType.REORDER && doc.answerKeyReorder && { answerKeyReorder: doc.answerKeyReorder }),
    };
  }

  async createBulkQuestions(questions: CreateQuestionDto[], createdBy?: string) {
    const results: Array<{
      index: number;
      id: any;
      prompt: string;
      qType: QuestionType;
      options?: any[];
      correctAnswer?: string;
      status: QuestionStatus;
      provider?: string;
      level?: string;
      tags?: string[];
      state?: string;
      usageCategory?: string;
      mainSkill?: string;
    }> = [];
    const errors: Array<{ index: number; prompt: string; error: string }> = [];

    for (let i = 0; i < questions.length; i++) {
      try {
        const question = questions[i];
        this.validateCreatePayload(question);
        
        // استخراج examId من الـ dto قبل إنشاء السؤال
        const { examId, ...questionData } = question;
        
        const doc = await this.model.create({
          ...questionData,
          status: question.status ?? QuestionStatus.PUBLISHED,
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
          // INTERACTIVE_TEXT fields (إذا كانت موجودة)
          ...(question.qType === QuestionType.INTERACTIVE_TEXT && {
            ...(question.text && { text: question.text }),
            ...(question.interactiveBlanks && Array.isArray(question.interactiveBlanks) && question.interactiveBlanks.length > 0 && {
              interactiveBlanks: question.interactiveBlanks.map((blank: any) => {
                // تحويل select إلى dropdown للتوحيد
                const type = blank.type === 'select' ? 'dropdown' : blank.type;
                // استخدام options إذا كان موجوداً، وإلا choices
                const options = blank.options || blank.choices;
                const choices = blank.choices || blank.options;
                return {
                  ...blank,
                  type,
                  options,
                  choices, // للتوافق مع الكود القديم
                };
              }),
            }),
            ...(question.interactiveReorder && { interactiveReorder: question.interactiveReorder }),
          }),
        });

        // إذا كان examId موجود، نربط السؤال بالامتحان
        if (examId) {
          await this.addQuestionToExam(examId, String(doc._id), question.section);
        }

        // استخراج correctAnswer من الخيارات إذا لم يكن موجوداً (لأسئلة MCQ)
        let correctAnswer = doc.correctAnswer;
        if (doc.qType === QuestionType.MCQ && (!correctAnswer || correctAnswer === '') && doc.options) {
          const correctOption = doc.options.find((opt: any) => opt.isCorrect === true);
          if (correctOption) {
            correctAnswer = correctOption.text;
            // تحديث السؤال في قاعدة البيانات أيضاً
            if (!doc.correctAnswer) {
              doc.correctAnswer = correctAnswer;
              await doc.save();
            }
          }
        }

        // إرجاع جميع الحقول المهمة
        const docObj = doc.toObject();
        results.push({
          index: i,
          id: doc._id,
          prompt: doc.prompt,
          qType: doc.qType,
          options: doc.options,
          correctAnswer: correctAnswer || doc.correctAnswer,
          status: doc.status,
          provider: doc.provider,
          level: doc.level,
          tags: doc.tags,
          state: (docObj as any).state,
          usageCategory: (docObj as any).usageCategory,
          mainSkill: (docObj as any).mainSkill,
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
    // Exam Versioning: زيادة version عند إضافة سؤال
    exam.version = (exam.version || 1) + 1;
    this.logger.log(`[addQuestionToExam] Version incremented to ${exam.version} after adding question ${questionId}`);
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
    if (filters.usageCategory) q.usageCategory = filters.usageCategory;
    if (filters.mainSkill) q.mainSkill = filters.mainSkill;

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
        // للأسئلة العامة (usageCategory='common') + أسئلة الولاية المحددة (usageCategory='state_specific' و state=المحدد)
        q.$or = [
          { 
            usageCategory: 'common', // أسئلة عامة (300-Fragen)
            tags: { $nin: allStates } // تأكيد عدم وجود tags للولايات
          },
          { 
            usageCategory: 'state_specific', // أسئلة الولاية المحددة
            state: filters.state // الولاية المحددة
          },
          // للتوافق مع الأسئلة القديمة التي قد لا تحتوي على usageCategory
          {
            usageCategory: { $exists: false },
            tags: { $nin: allStates } // أسئلة عامة قديمة
          },
          {
            usageCategory: { $exists: false },
            tags: filters.state // أسئلة ولاية قديمة
          }
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
    
    // Log للتحقق من answerKeyMatch
    if (question.qType === QuestionType.MATCH) {
      this.logger.warn(`findById: Match question ${cleanId} - answerKeyMatch: ${JSON.stringify(question.answerKeyMatch)}`);
      this.logger.warn(`findById: Match question ${cleanId} - question keys: ${Object.keys(question).join(', ')}`);
      // إذا كان answerKeyMatch غير موجود، نرجعه كـ undefined صراحة
      if (!question.answerKeyMatch) {
        this.logger.warn(`findById: Match question ${cleanId} - answerKeyMatch is missing in database!`);
      }
    }
    
    // Log للتحقق من description في media/images
    if (question.media?.description) {
      this.logger.debug(`findById: Question ${cleanId} - media.description: ${question.media.description}`);
    }
    if (question.images && question.images.length > 0) {
      question.images.forEach((img: any, idx: number) => {
        if (img.description) {
          this.logger.debug(`findById: Question ${cleanId} - images[${idx}].description: ${img.description}`);
        }
      });
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

    // Log للتحقق من answerKeyMatch في التحديث
    if (updateData.answerKeyMatch && Array.isArray(updateData.answerKeyMatch)) {
      this.logger.warn(`updateQuestion: Updating answerKeyMatch for question ${id}: ${JSON.stringify(updateData.answerKeyMatch)}`);
    } else {
      // Log إذا كان answerKeyMatch غير موجود في updateData
      this.logger.warn(`updateQuestion: answerKeyMatch not found in updateData for question ${id}. Keys: ${Object.keys(updateData).join(', ')}`);
    }

    // تطبيق التحديث (بدون qType)
    const updated = await this.model.findByIdAndUpdate(id, updateData, { new: true }).lean().exec();
    if (!updated) throw new NotFoundException('Question not found');
    
    // Log للتحقق من answerKeyMatch بعد التحديث
    if (updated.qType === QuestionType.MATCH) {
      this.logger.warn(`updateQuestion: Match question ${id} - answerKeyMatch after update: ${JSON.stringify(updated.answerKeyMatch)}`);
      if (!updated.answerKeyMatch) {
        this.logger.error(`updateQuestion: ERROR - answerKeyMatch is missing after update for question ${id}!`);
      }
    }
    
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

    // تنظيف السؤال من جميع أقسام الامتحانات
    await this.cleanupQuestionFromExams(id);

    if (!hard) {
      doc.status = QuestionStatus.ARCHIVED;
      await doc.save();
      return { archived: true };
    }

    await this.model.deleteOne({ _id: id }).exec();
    return { deleted: true };
  }

  /**
   * حذف السؤال من جميع أقسام الامتحانات التي يظهر فيها
   */
  private async cleanupQuestionFromExams(questionId: string) {
    try {
      const exams = await this.examModel.find({
        'sections.items.questionId': new Types.ObjectId(questionId),
      }).exec();

      for (const exam of exams) {
        let modified = false;
        for (const section of (exam as any).sections || []) {
          if (section.items && Array.isArray(section.items)) {
            const before = section.items.length;
            section.items = section.items.filter(
              (item: any) => item.questionId?.toString() !== questionId,
            );
            if (section.items.length < before) modified = true;
          }
        }
        if (modified) {
          exam.markModified('sections');
          await exam.save();
        }
      }
    } catch (err) {
      // لا نوقف الحذف إذا فشل التنظيف
      console.error('Failed to cleanup question from exams:', err);
    }
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

    // إضافة optionId لكل option في الأسئلة
    const itemsWithOptionIds = items.map((item: any) => {
      if (item.options && Array.isArray(item.options)) {
        return {
          ...item,
          options: item.options.map((opt: any) => ({
            optionId: opt._id ? String(opt._id) : undefined,
            text: opt.text,
            isCorrect: opt.isCorrect || false,
          })),
        };
      }
      return item;
    });

    return {
      page,
      limit,
      total,
      items: itemsWithOptionIds,
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
    const { examId, sectionTitle, section, sectionKey, points, text, interactiveText, prompt, type, qType, provider, skill, teilNumber, usageCategory, listeningClipId, answerKeyBoolean, fillExact, regexList, answerKeyMatch, answerKeyReorder, grammarTopicId, grammarLevel, grammarTopic, ...questionData } = dto;
    
    // استخدام type إذا كان موجوداً، وإلا استخدام qType
    const questionType = type || qType;
    
    // استخدام interactiveText إذا كان موجوداً (للـ interactive_text)، وإلا text
    const questionText = interactiveText || text;
    const questionPrompt = prompt ?? questionText;

    // 1) جلب الامتحان أولاً (لأخذ listeningAudioId من section إذا لزم الأمر)
    const exam = await this.examModel.findById(examId).exec();
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // 2) الصوت اختياري - يُرفع مع السؤال في الفرونت (ليس من القسم)
    // الفرونت يرفع الصوت أولاً عبر POST /listening-clips/upload-audio ويبعث listeningClipId مع السؤال
    const finalListeningClipId = listeningClipId || undefined;
    if (finalListeningClipId) {
      this.logger.log(
        `[createQuestionWithExam] Question with listeningClipId: ${finalListeningClipId}`,
      );
    } else {
      this.logger.log(
        `[createQuestionWithExam] Question without audio (listeningClipId not provided)`,
      );
    }

    // 3) تأكيد وجود خيار صحيح (فقط لـ MCQ)
    let correctOption: any = null;
    if (questionType === 'mcq' && questionData.options) {
      correctOption = questionData.options.find((opt) => opt.isCorrect);
      if (!correctOption) {
        throw new BadRequestException(
          'At least one option must be marked as correct',
        );
      }
    }

    // 3.1) التحقق من answerKeyBoolean لأسئلة TRUE_FALSE
    if (questionType === QuestionType.TRUE_FALSE && typeof answerKeyBoolean !== 'boolean') {
      throw new BadRequestException(
        'answerKeyBoolean is required for true_false questions and must be a boolean',
      );
    }

    // 4) إنشاء السؤال
    const sectionName = section || sectionTitle;
    
    // Log للتحقق من answerKeyMatch
    if (questionType === QuestionType.MATCH) {
      this.logger.debug(`createQuestionWithExam: Match question - answerKeyMatch: ${JSON.stringify(answerKeyMatch)}`);
    }
    
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
      // FILL fields
      ...(questionType === QuestionType.FILL && {
        ...(fillExact && { fillExact }),
        ...(regexList && Array.isArray(regexList) && regexList.length > 0 && { regexList }),
      }),
      // MATCH fields
      ...(questionType === QuestionType.MATCH && answerKeyMatch && Array.isArray(answerKeyMatch) && { answerKeyMatch }),
      // REORDER fields
      ...(questionType === QuestionType.REORDER && answerKeyReorder && Array.isArray(answerKeyReorder) && { answerKeyReorder }),
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
      // INTERACTIVE_TEXT fields
      ...(questionType === QuestionType.INTERACTIVE_TEXT && {
        ...(interactiveText && { interactiveText }),
        // استخدام interactiveText إذا كان موجوداً، وإلا text
        ...((interactiveText || questionText) && { text: interactiveText || questionText }),
        ...(questionData.interactiveBlanks && Array.isArray(questionData.interactiveBlanks) && questionData.interactiveBlanks.length > 0 && {
          interactiveBlanks: questionData.interactiveBlanks.map((blank: any) => {
            // تحويل select إلى dropdown للتوحيد
            const type = blank.type === 'select' ? 'dropdown' : blank.type;
            // استخدام options إذا كان موجوداً، وإلا choices
            const options = blank.options || blank.choices;
            const choices = blank.choices || blank.options;
            return {
              ...blank,
              type,
              options,
              choices, // للتوافق مع الكود القديم
            };
          }),
        }),
        ...(questionData.interactiveReorder && { interactiveReorder: questionData.interactiveReorder }),
      }),
      ...(questionData.explanation && { explanation: questionData.explanation }),
      ...(questionData.difficulty && { difficulty: questionData.difficulty as QuestionDifficulty }),
      level: questionData.level,
      status: (questionData.status as QuestionStatus) || QuestionStatus.PUBLISHED,
      tags: questionData.tags,
      provider: provider,
      section: sectionName,
      // حفظ examId و sectionTitle مع السؤال للربط الصحيح
      ...(examId && { examId: new Types.ObjectId(examId) }),
      ...(sectionTitle && { sectionTitle }),
      ...(questionData.audioUrl && { audioUrl: questionData.audioUrl }),
      ...(finalListeningClipId && { listeningClipId: new Types.ObjectId(finalListeningClipId) }),
      ...(questionData.media && { media: questionData.media }),
      // للحقول الخاصة بـ Leben in Deutschland
      ...(skill && { mainSkill: skill as any }),
      ...(usageCategory && { usageCategory }),
      // لو عندك createdBy/ownerId حطيه هنا
      // createdBy: userId ? new Types.ObjectId(userId) : undefined,
    });

    // 5) تنظيف sections من null أو قيم غريبة
    const cleanSections: any[] = Array.isArray(exam.sections)
      ? exam.sections.filter((sec: any) => !!sec && typeof sec === 'object')
      : [];

    // 5.1) Normalize skill في جميع الـ sections الموجودة (لإصلاح البيانات القديمة)
    cleanSections.forEach((sec: any) => {
      if (sec.skill && typeof sec.skill === 'string') {
        const normalized = normalizeSkill(sec.skill);
        if (normalized && typeof normalized === 'string') {
          sec.skill = normalized;
        }
      }
    });

    // Normalize skill قبل البحث عن القسم
    const normalizedSkill = skill ? normalizeSkill(skill) : undefined;
    const finalSkill = normalizedSkill && typeof normalizedSkill === 'string' ? normalizedSkill : skill;

    // 6) البحث عن سكشن بـ sectionKey أولاً، ثم بالاسم، ثم بـ skill+teilNumber
    let sectionIndex = -1;
    if (sectionKey) {
      // البحث عبر key المحفوظ أو المولّد تلقائياً
      sectionIndex = cleanSections.findIndex((sec: any) => {
        // مطابقة key المحفوظ
        if (sec.key === sectionKey) return true;
        // مطابقة key المولّد (للأقسام القديمة بدون key)
        if (!sec.key) {
          const generatedKey = (sec.skill && sec.teilNumber)
            ? `${sec.skill.toLowerCase()}_teil${sec.teilNumber}`
            : (sec.title || sec.name || '').toLowerCase().replace(/[^a-z0-9äöüß]+/g, '_').replace(/(^_|_$)/g, '');
          return generatedKey === sectionKey;
        }
        return false;
      });
    }
    if (sectionIndex === -1 && sectionName) {
      // fallback 1: البحث بالاسم (الطريقة القديمة)
      sectionIndex = cleanSections.findIndex(
        (sec: any) => sec.name === sectionName || sec.title === sectionName,
      );
    }
    if (sectionIndex === -1 && finalSkill && teilNumber) {
      // fallback 2: البحث عبر skill + teilNumber (يطابق أقسام موجودة بنفس المهارة والجزء)
      sectionIndex = cleanSections.findIndex(
        (sec: any) => sec.skill && sec.teilNumber &&
          sec.skill.toLowerCase() === finalSkill.toLowerCase() &&
          sec.teilNumber === teilNumber,
      );
    }

    if (sectionIndex === -1) {
      // 7) لو مش موجود → نضيف سكشن جديد فيه السؤال
      const newKey = sectionKey || (finalSkill && teilNumber ? `${finalSkill}_teil${teilNumber}` : undefined);
      cleanSections.push({
        key: newKey,
        name: sectionName || (sectionKey ? sectionKey : undefined),
        title: sectionName || (sectionKey ? sectionKey : undefined),
        skill: finalSkill,
        teilNumber: teilNumber,
        items: [
          {
            questionId: (question as any)._id,
            points: points ?? 1,
          },
        ],
      });
    } else {
      // 8) لو موجود → نضيف السؤال في items
      const items = Array.isArray(cleanSections[sectionIndex].items)
        ? cleanSections[sectionIndex].items
        : [];
      items.push({
        questionId: question._id,
        points: points ?? 1,
      });
      cleanSections[sectionIndex].items = items;
      // تحديث skill في الـ section الموجود إذا كان مختلفاً
      if (finalSkill && cleanSections[sectionIndex].skill !== finalSkill) {
        cleanSections[sectionIndex].skill = finalSkill;
      }
    }

    // 9) حفظ السكاشن المعدّلة في الامتحان
    exam.sections = cleanSections as any;
    
    // Normalize provider before saving
    if (exam.provider) {
      const normalized = normalizeProvider(exam.provider);
      if (normalized) {
        exam.provider = normalized;
      }
    }
    
    await exam.save();

    // 10) ربط الامتحان بالموضوع (grammarTopic) إذا كان grammarLevel و grammarTopic موجودين
    if (grammarLevel && grammarTopic) {
      await this.grammarTopicsService.attachExamToTopic(
        grammarLevel,
        grammarTopic,
        (exam as any)._id.toString(),
      );
    } else if (grammarTopicId) {
      // للتوافق مع الكود القديم: استخدام grammarTopicId إذا كان موجوداً
      await this.grammarTopicModel.findByIdAndUpdate(
        grammarTopicId,
        { examId: (exam as any)._id },
        { new: true },
      ).exec();
    }

    // إرجاع النتيجة
    const questionDoc = question.toObject();
    const { __v, ...questionWithoutV } = questionDoc;

    return {
      message: 'Question created and added to exam',
      question: questionWithoutV,
      questionId: (question as any)._id.toString(),
      examId: (exam as any)._id.toString(),
      sectionTitle: sectionName,
      section: sectionName,
    };
  }

  /**
   * جلب الأسئلة العامة للتعلم (300 سؤال)
   * يرجع الأسئلة مع الإجابات الصحيحة والشرح
   */
  async getLearnGeneralQuestions(dto: LearnGeneralQuestionsDto) {
    // للتعلم: نرجع كل الأسئلة (300) بدون pagination
    // إذا limit محدد، نستخدمه للـ pagination
    const usePagination = dto.limit && dto.limit < 500;
    const page = usePagination ? Math.max(dto.page || 1, 1) : 1;
    const limit = usePagination ? Math.max(Math.min(dto.limit || 20, 100), 1) : 500; // حد أقصى 500
    const skip = usePagination ? (page - 1) * limit : 0;

    // فلترة الأسئلة العامة (common) من Leben in Deutschland
    // ✅ فصل واضح: general = بدون state تماماً
    // استثناء صريح: أي سؤال له state (حتى لو category='general') لا يُعتبر general
    const query: FilterQuery<QuestionDocument> = {
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test',
      status: QuestionStatus.PUBLISHED,
      // شرط أساسي: بدون state تماماً (يجب يكون null أو غير موجود أو string فارغ)
      $and: [
        {
          $or: [
            { state: { $exists: false } },
            { state: null },
            { state: '' },
          ],
        },
      ],
    };

    this.logger.log(`[getLearnGeneralQuestions] Query: ${JSON.stringify(query)}`);

    // جلب جميع الأسئلة (300) بدون pagination للتعلم
    const allQuestions = await this.model.find(query).sort({ createdAt: 1 }).lean().exec();
    const total = allQuestions.length;

    this.logger.log(`[getLearnGeneralQuestions] Found ${total} general questions (expected: 300)`);

    // إذا كان limit محدد وصغير، نستخدم pagination
    const items = usePagination ? allQuestions.slice(skip, skip + limit) : allQuestions;

    // معالجة الأسئلة لإرجاع الإجابات الصحيحة
    const processedItems = items.map((item: any) => {
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
        explanation: item.explanation || null,
        media: item.media || null,
        images: Array.isArray(item.images) ? item.images : (item.images ? [item.images] : []), // تأكد من أن images array
        level: item.level,
        tags: item.tags || [],
        usageCategory: item.usageCategory,
        description: item.description || null, // إضافة description
      };
    });

    return {
      page,
      limit,
      total,
      items: processedItems,
    };
  }

  /**
   * جلب الأسئلة الولادية للتعلم (160 سؤال - 10 لكل ولاية)
   * يرجع الأسئلة مع الإجابات الصحيحة والشرح
   */
  async getLearnStateQuestions(dto: LearnStateQuestionsDto) {
    // للتعلم: نرجع كل أسئلة الولاية (10) بدون pagination
    // إذا limit محدد، نستخدمه للـ pagination
    const usePagination = dto.limit && dto.limit < 50;
    const page = usePagination ? Math.max(dto.page || 1, 1) : 1;
    const limit = usePagination ? Math.max(Math.min(dto.limit || 20, 100), 1) : 50; // حد أقصى 50
    const skip = usePagination ? (page - 1) * limit : 0;

    // فلترة أسئلة الولاية المحددة
    // ✅ فصل واضح: state = مع state field محدد
    const query: FilterQuery<QuestionDocument> = {
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test',
      status: QuestionStatus.PUBLISHED,
      // شرط أساسي: مع state محدد
      state: dto.state,
      // تصنيف: state أو state_specific
      $or: [
        { category: 'state' },
        { usageCategory: 'state_specific' },
        { 
          category: { $exists: false },
          usageCategory: { $exists: false },
        },
      ],
    };

    this.logger.log(`[getLearnStateQuestions] Query for state=${dto.state}: ${JSON.stringify(query)}`);

    // جلب جميع أسئلة الولاية (10) بدون pagination للتعلم
    const allQuestions = await this.model.find(query).sort({ createdAt: 1 }).lean().exec();
    const total = allQuestions.length;

    this.logger.log(`[getLearnStateQuestions] Found ${total} questions for state=${dto.state} (expected: 10 per state, total 160)`);

    // إذا كان limit محدد وصغير، نستخدم pagination
    const items = usePagination ? allQuestions.slice(skip, skip + limit) : allQuestions;

    // معالجة الأسئلة لإرجاع الإجابات الصحيحة
    const processedItems = items.map((item: any) => {
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

      // معالجة images: تأكد من أن images array وليس object واحد
      let imagesArray: any[] = [];
      if (item.images) {
        if (Array.isArray(item.images)) {
          imagesArray = item.images;
        } else if (typeof item.images === 'object') {
          // إذا كان object واحد، حوله لـ array
          imagesArray = [item.images];
        }
      }

      return {
        id: item._id.toString(),
        prompt: item.prompt || item.text,
        qType: item.qType,
        options: item.options || [],
        correctAnswer,
        correctOptionId,
        explanation: item.explanation || null,
        media: item.media || null,
        images: imagesArray, // جميع الصور
        level: item.level,
        tags: item.tags || [],
        state: item.state,
        usageCategory: item.usageCategory,
        description: item.description || null, // إضافة description
      };
    });

    return {
      page,
      limit,
      total,
      state: dto.state,
      items: processedItems,
    };
  }

  async publishAllDrafts(): Promise<{ modifiedCount: number }> {
    const result = await this.model.updateMany(
      { status: QuestionStatus.DRAFT },
      { $set: { status: QuestionStatus.PUBLISHED } },
    );
    return { modifiedCount: result.modifiedCount };
  }
}
