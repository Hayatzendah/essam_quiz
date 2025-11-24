import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Attempt, AttemptDocument, AttemptStatus } from './schemas/attempt.schema';
import { Exam, ExamDocument, ExamStatus } from '../exams/schemas/exam.schema';
import { Question, QuestionDocument, QuestionStatus } from '../questions/schemas/question.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { MediaService } from '../modules/media/media.service';
import { mulberry32, shuffleInPlace, pickRandom } from '../common/utils/random.util';
import { seedFrom } from '../common/utils/seed.util';
import { normalizeAnswer } from '../common/utils/normalize.util';
import { MSG } from '../common/constants/messages';
import { ExamsService } from '../exams/exams.service';
import { CreatePracticeExamDto } from '../exams/dto/create-exam.dto';

type ReqUser = { userId: string; role: 'student'|'teacher'|'admin' };

@Injectable()
export class AttemptsService {
  private readonly logger = new Logger(AttemptsService.name);

  constructor(
    @InjectModel(Attempt.name) private readonly AttemptModel: Model<AttemptDocument>,
    @InjectModel(Exam.name) private readonly ExamModel: Model<ExamDocument>,
    @InjectModel(Question.name) private readonly QuestionModel: Model<QuestionDocument>,
    @InjectModel(User.name) private readonly UserModel: Model<UserDocument>,
    private readonly media: MediaService,
    private readonly examsService: ExamsService,
  ) {}

  private async computeAttemptCount(studentId: Types.ObjectId, examId: Types.ObjectId) {
    const count = await this.AttemptModel.countDocuments({ studentId, examId }).exec();
    return count + 1;
  }

  private computeSeed(attemptCount: number, studentId: string, examId: string) {
    return seedFrom(examId, studentId, attemptCount);
  }

  private ensureStudent(user: ReqUser) {
    if (!user) {
      this.logger.error('ensureStudent: user is null or undefined');
      throw new ForbiddenException({
        code: 'USER_NOT_AUTHENTICATED',
        message: 'User is not authenticated',
      });
    }
    if (user.role !== 'student') {
      this.logger.error(`ensureStudent: user role is "${user.role}", expected "student"`);
      throw new ForbiddenException({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Only students can start exam attempts',
        userRole: user.role,
        requiredRole: 'student',
      });
    }
  }

  /**
   * تطبيع provider للبحث - يدعم "LiD" و "Deutschland-in-Leben"
   */
  private normalizeProvider(provider?: string): string[] {
    if (!provider) return [];
    
    const normalized = provider.trim();
    
    // إذا كان "LiD" أو اختصارات أخرى، نبحث عن كلا القيمتين
    if (normalized === 'LiD' || normalized === 'lid' || normalized === 'LID') {
      return ['Deutschland-in-Leben', 'LiD', 'lid', 'LID'];
    }
    
    // إذا كان "Deutschland-in-Leben"، نبحث عن كلا القيمتين أيضاً
    if (normalized === 'Deutschland-in-Leben' || normalized === 'Deutschland in Leben') {
      return ['Deutschland-in-Leben', 'LiD', 'lid', 'LID', 'Deutschland in Leben'];
    }
    
    // للـ providers الأخرى، نرجع القيمة كما هي
    return [normalized];
  }

  private async generateQuestionListForAttempt(exam: ExamDocument, rng: () => number, studentState?: string) {
    this.logger.log(`[generateQuestionListForAttempt] Starting - exam: ${exam.title}, sections: ${exam.sections.length}, studentState: ${studentState || 'not set'}`);
    const selected: Array<{ question: QuestionDocument; points: number }> = [];

    for (let secIndex = 0; secIndex < exam.sections.length; secIndex++) {
      const sec = exam.sections[secIndex];
      const hasItems = Array.isArray((sec as any).items) && (sec as any).items.length > 0;
      const hasQuota = typeof (sec as any).quota === 'number' && (sec as any).quota > 0;

      this.logger.log(`[generateQuestionListForAttempt] Section ${secIndex + 1}/${exam.sections.length}: "${sec.name}", hasItems: ${hasItems}, hasQuota: ${hasQuota}, quota: ${(sec as any).quota}, tags: ${JSON.stringify((sec as any).tags || [])}`);

      if (hasItems) {
        const itemIds = (sec as any).items.map((it: any) => new Types.ObjectId(it.questionId));
        const qDocs = await this.QuestionModel.find({
          _id: { $in: itemIds },
          status: QuestionStatus.PUBLISHED,
        }).lean(false).exec();

        let sectionItems: Array<{ question: QuestionDocument; points: number }> = [];
        for (const it of (sec as any).items) {
          const q = qDocs.find((d: any) => d._id.toString() === String(it.questionId));
          if (q) sectionItems.push({ question: q, points: it.points ?? 1 });
        }

        if (sectionItems.length === 0) {
          this.logger.warn(`No published questions found for section with items - section: ${sec.name}`);
          throw new BadRequestException({
            code: 'NO_QUESTIONS_FOR_SECTION',
            message: `No published questions found for section "${sec.name}"`,
            sectionName: sec.name,
          });
        }

        // خلط ترتيب الأسئلة داخل القسم إذا كان randomize=true
        if ((sec as any).randomize && sectionItems.length > 1) {
          shuffleInPlace(sectionItems, rng);
        }

        selected.push(...sectionItems);
        this.logger.debug(`Section "${sec.name}": Added ${sectionItems.length} questions from items`);
      } else if (hasQuota) {
        const filter: any = { status: QuestionStatus.PUBLISHED };
        
        // فلترة أساسية: provider و level (مطلوبة)
        if (exam.level) filter.level = exam.level;
        
        // تطبيع provider لدعم "LiD" و "Deutschland-in-Leben"
        if ((exam as any).provider) {
          const providerVariants = this.normalizeProvider((exam as any).provider);
          if (providerVariants.length === 1) {
            filter.provider = providerVariants[0];
          } else {
            filter.provider = { $in: providerVariants };
          }
          this.logger.debug(`Normalized provider: "${(exam as any).provider}" -> ${JSON.stringify(providerVariants)}`);
        }
        
        // ⚠️ لا نضيف section للفلترة لأن أسئلة Deutschland-in-Leben قد لا تحتوي على section
        // بدلاً من ذلك، نستخدم tags فقط للفلترة
        
        // دعم tags من section
        const sectionTags: string[] = [];
        if ((sec as any).tags && Array.isArray((sec as any).tags) && (sec as any).tags.length > 0) {
          sectionTags.push(...(sec as any).tags);
        }
        
        // إذا كان provider = "Deutschland-in-Leben" أو "LiD" و section يحتوي على tags للولاية
        // نستخدم الولاية من tags القسم نفسه (الامتحان محدد لولاية معينة)
        const examProvider = (exam as any).provider?.toLowerCase();
        const germanStates = ['Bayern', 'Berlin', 'NRW', 'Baden-Württemberg', 'Brandenburg', 'Bremen', 
          'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen', 
          'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen', 
          'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen'];
        
        if (examProvider === 'deutschland-in-leben' || examProvider === 'lid') {
          // إذا كان section يحتوي على tags للولاية، نستخدم الولاية من tags القسم
          const stateInTags = sectionTags.find(tag => germanStates.includes(tag));
          
          if (stateInTags) {
            // القسم مخصص لولاية معينة - نستخدم الولاية من tags القسم
            // نزيل جميع tags الولايات ونضع فقط الولاية المطلوبة
            const filteredTags = sectionTags.filter(tag => !germanStates.includes(tag));
            sectionTags.length = 0;
            sectionTags.push(...filteredTags, stateInTags);
            this.logger.debug(`State section detected - using state from section tags: ${stateInTags} for section: ${sec.name}`);
          } else if (studentState && sectionTags.some(tag => germanStates.includes(tag))) {
            // إذا كان section يحتوي على tags للولاية لكن ليس الولاية المحددة
            // نستخدم studentState كبديل (للتوافق مع النظام القديم)
            const filteredTags = sectionTags.filter(tag => !germanStates.includes(tag));
            sectionTags.length = 0;
            sectionTags.push(...filteredTags, studentState);
            this.logger.debug(`State section detected - using studentState: ${studentState} for section: ${sec.name}`);
          }
        }
        
        // فلترة tags: نبحث عن أسئلة تحتوي على أي من section tags
        // هذا يسمح بالعثور على أسئلة تحتوي على الـ tag المطلوب حتى لو كان لها tags أخرى (مثل tags ولايات)
        if (sectionTags.length > 0) {
          // تطبيع tags: نبحث عن tags بجميع الـ variations المحتملة لتجنب مشاكل case sensitivity
          // هذا يحل مشاكل مثل "Fragen-300" vs "fragen-300" vs "300-Fragen"
          const normalizedTags: string[] = [];
          for (const tag of sectionTags) {
            normalizedTags.push(tag); // الأصل أولاً
            const tagLower = tag.toLowerCase();
            
            // إضافة variations شائعة للـ "300 Fragen" tags
            if (tagLower.includes('fragen') && tagLower.includes('300')) {
              const variations = [
                '300-Fragen', 'fragen-300', 'Fragen-300', '300-fragen',
                '300 Fragen', 'Fragen 300', '300_Fragen', 'Fragen_300'
              ];
              normalizedTags.push(...variations);
            }
          }
          // إزالة duplicates مع الحفاظ على الترتيب
          const uniqueTags = Array.from(new Set(normalizedTags));
          filter.tags = { $in: uniqueTags };
          this.logger.debug(`[Section: ${sec.name}] Filtering by tags - original: ${JSON.stringify(sectionTags)}, normalized (${uniqueTags.length} variations): ${JSON.stringify(uniqueTags)}`);
        }

        this.logger.log(`[Section: ${sec.name}] Searching questions with filter: ${JSON.stringify(filter, null, 2)}`);
        this.logger.log(`[Section: ${sec.name}] Exam provider: "${(exam as any).provider}", level: "${exam.level}", sectionTags: ${JSON.stringify(sectionTags)}`);
        
        const candidates = await this.QuestionModel.find(filter).lean(false).exec();
        this.logger.log(`[Section: ${sec.name}] Found ${candidates.length} candidate questions (quota required: ${(sec as any).quota})`);
        
        if (candidates.length > 0) {
          this.logger.debug(`[Section: ${sec.name}] Sample candidates: ${JSON.stringify(candidates.slice(0, 3).map((q: any) => ({ 
            id: q._id, 
            provider: q.provider, 
            level: q.level, 
            tags: q.tags,
            status: q.status 
          })))}`);
        }

        if (candidates.length === 0) {
          // محاولة البحث بدون tags أولاً لمعرفة ما إذا كانت المشكلة في tags
          const filterWithoutTags: any = { status: QuestionStatus.PUBLISHED };
          if (exam.level) filterWithoutTags.level = exam.level;
          if ((exam as any).provider) {
            const providerVariants = this.normalizeProvider((exam as any).provider);
            if (providerVariants.length === 1) {
              filterWithoutTags.provider = providerVariants[0];
            } else {
              filterWithoutTags.provider = { $in: providerVariants };
            }
          }
          
          const candidatesWithoutTags = await this.QuestionModel.find(filterWithoutTags).lean(false).exec();
          
          // البحث عن أسئلة تحتوي على section tags (حتى لو كانت لها tags أخرى)
          const candidatesWithTags = sectionTags.length > 0 
            ? await this.QuestionModel.find({ 
                status: QuestionStatus.PUBLISHED,
                tags: { $in: sectionTags }
              }).lean(false).limit(10).exec()
            : [];
          
          // البحث عن جميع الأسئلة المنشورة لنفس المستوى (بدون provider) لمعرفة ما هو موجود
          const allPublishedForLevel = await this.QuestionModel.find({ 
            status: QuestionStatus.PUBLISHED,
            level: exam.level 
          }).lean(false).limit(10).exec();
          
          // البحث عن جميع الأسئلة المنشورة (بدون أي فلترة) لمعرفة ما هو موجود
          const allPublished = await this.QuestionModel.find({ 
            status: QuestionStatus.PUBLISHED 
          }).lean(false).limit(10).exec();
          
          this.logger.error(`❌ No questions found for section "${sec.name}"`);
          this.logger.error(`📋 Filter used: ${JSON.stringify(filter, null, 2)}`);
          this.logger.error(`🔍 Questions found without tags filter (provider + level only): ${candidatesWithoutTags.length}`);
          this.logger.error(`🏷️  Questions found with section tags only (${JSON.stringify(sectionTags)}): ${candidatesWithTags.length}`);
          this.logger.error(`📊 Total published questions for level "${exam.level}": ${allPublishedForLevel.length}`);
          this.logger.error(`📊 Total published questions (any level): ${allPublished.length}`);
          
          if (candidatesWithoutTags.length > 0) {
            this.logger.error(`📝 Sample questions (provider + level match, tags may differ): ${JSON.stringify(candidatesWithoutTags.slice(0, 5).map((q: any) => ({ 
              id: q._id, 
              tags: q.tags, 
              provider: q.provider, 
              level: q.level,
              status: q.status
            })), null, 2)}`);
          }
          
          if (candidatesWithTags.length > 0) {
            this.logger.error(`📝 Sample questions with section tags (${JSON.stringify(sectionTags)}): ${JSON.stringify(candidatesWithTags.slice(0, 5).map((q: any) => ({ 
              id: q._id, 
              tags: q.tags, 
              provider: q.provider, 
              level: q.level,
              status: q.status
            })), null, 2)}`);
          }
          
          if (allPublishedForLevel.length > 0) {
            this.logger.error(`📝 Sample questions for level "${exam.level}": ${JSON.stringify(allPublishedForLevel.slice(0, 5).map((q: any) => ({ 
              id: q._id, 
              provider: q.provider, 
              level: q.level, 
              tags: q.tags,
              status: q.status 
            })), null, 2)}`);
          }
          
          throw new BadRequestException({
            code: 'NO_QUESTIONS_FOR_SECTION',
            message: `No questions found for section "${sec.name}"`,
            sectionName: sec.name,
            filter: {
              provider: (exam as any).provider,
              level: exam.level,
              tags: sectionTags,
              status: 'published',
            },
            diagnostic: {
              questionsFoundWithoutTags: candidatesWithoutTags.length,
              totalPublishedForLevel: allPublishedForLevel.length,
              totalPublished: allPublished.length,
              sampleQuestionsForLevel: allPublishedForLevel.slice(0, 5).map((q: any) => ({
                id: q._id,
                provider: q.provider,
                level: q.level,
                tags: q.tags,
                status: q.status,
              })),
              sampleQuestions: candidatesWithoutTags.slice(0, 3).map((q: any) => ({
                id: q._id,
                provider: q.provider,
                level: q.level,
                tags: q.tags,
                status: q.status,
              })),
            },
          });
        }

        let pickList: QuestionDocument[] = [];

        if ((sec as any).difficultyDistribution) {
          // استخدام tags للصعوبة: ["easy"], ["medium"], ["hard"]
          const dd = (sec as any).difficultyDistribution as any;
          const easy = candidates.filter((c: any) => c.tags && c.tags.includes('easy'));
          const med  = candidates.filter((c: any) => c.tags && c.tags.includes('medium'));
          const hard = candidates.filter((c: any) => c.tags && c.tags.includes('hard'));

          this.logger.debug(`Difficulty distribution - easy: ${easy.length}, medium: ${med.length}, hard: ${hard.length}, required: easy=${dd.easy || 0}, medium=${dd.medium || 0}, hard=${dd.hard || 0}`);

          pickList = [
            ...pickRandom(easy, dd.easy || 0, rng),
            ...pickRandom(med,  dd.medium || 0, rng),
            ...pickRandom(hard, dd.hard || 0, rng),
          ];

          const deficit = (sec as any).quota - pickList.length;
          if (deficit > 0) {
            const left = candidates.filter((c: any) => !pickList.some((p: any) => p._id.equals(c._id)));
            pickList.push(...pickRandom(left, deficit, rng));
          }
        } else {
          pickList = pickRandom(candidates, (sec as any).quota, rng);
        }

        if (pickList.length < (sec as any).quota) {
          this.logger.warn(`Not enough questions for section - section: ${sec.name}, required: ${(sec as any).quota}, found: ${pickList.length}, available: ${candidates.length}`);
          throw new BadRequestException({
            code: 'NOT_ENOUGH_QUESTIONS_FOR_SECTION',
            message: `Section "${sec.name}" requires ${(sec as any).quota} questions, but only ${pickList.length} are available (${candidates.length} total candidates)`,
            sectionName: sec.name,
            required: (sec as any).quota,
            available: pickList.length,
            totalCandidates: candidates.length,
            filter: {
              provider: (exam as any).provider,
              level: exam.level,
              tags: sectionTags,
              status: 'published',
            },
          });
        }

        for (const q of pickList) {
          selected.push({ question: q, points: 1 });
        }
        this.logger.debug(`Section "${sec.name}": Selected ${pickList.length} questions`);
      }
    }

    if (exam.randomizeQuestions) {
      this.logger.log(`[generateQuestionListForAttempt] Shuffling ${selected.length} questions (randomizeQuestions=true)`);
      shuffleInPlace(selected, rng);
    }
    this.logger.log(`[generateQuestionListForAttempt] Total questions selected: ${selected.length} for exam: ${exam.title}`);
    if (selected.length === 0) {
      this.logger.error(`[generateQuestionListForAttempt] WARNING: No questions selected! Exam sections: ${JSON.stringify(exam.sections.map((s: any) => ({ name: s.name, quota: s.quota, tags: s.tags, itemsCount: s.items?.length || 0 })))}`);
    }
    return selected;
  }

  private async buildSnapshotItem(q: QuestionDocument, points: number, rng?: () => number) {
    this.logger.debug(`[buildSnapshotItem] Building item for questionId: ${q._id}, qType: ${q.qType}, hasPrompt: ${!!q.prompt}`);
    
    const item: any = {
      questionId: q._id,
      qType: q.qType,
      points,
      promptSnapshot: q.prompt,
      autoScore: 0,
      manualScore: 0,
    };

    if (q.qType === 'mcq') {
      const options = [...(q.options || [])];
      const originalCorrectIdxs: number[] = [];
      options.forEach((o, i) => { if (o.isCorrect) originalCorrectIdxs.push(i); });

      // خلط ترتيب الخيارات إذا كان rng متوفر
      if (rng) {
        // إنشاء مصفوفة من الأزواج [index, option] لتتبع الفهرس الأصلي
        const indexedOptions = options.map((opt, idx) => ({ originalIndex: idx, option: opt }));
        shuffleInPlace(indexedOptions, rng);
        
        item.optionsText = indexedOptions.map(item => item.option.text);
        
        // حساب correctOptionIndexes الجديدة بعد الخلط
        const newCorrectIdxs: number[] = [];
        indexedOptions.forEach((item, newIdx) => {
          if (originalCorrectIdxs.includes(item.originalIndex)) {
            newCorrectIdxs.push(newIdx);
          }
        });
        item.correctOptionIndexes = newCorrectIdxs;
        
        // حفظ ترتيب الخيارات الأصلي للرجوع إليه
        item.optionOrder = indexedOptions.map(item => item.originalIndex);
        
        this.logger.debug(`[buildSnapshotItem] MCQ shuffled - original correct: [${originalCorrectIdxs.join(', ')}], new correct: [${newCorrectIdxs.join(', ')}]`);
      } else {
        item.optionsText = options.map(o => o.text);
        item.correctOptionIndexes = originalCorrectIdxs;
      }
    }

    if (q.qType === 'true_false') {
      item.answerKeyBoolean = (q as any).answerKeyBoolean;
      this.logger.debug(`[buildSnapshotItem] TRUE_FALSE - questionId: ${item.questionId}, answerKeyBoolean: ${item.answerKeyBoolean}`);
    }

    if (q.qType === 'fill') {
      // تطبيع fillExact عند الحفظ للتأكد من المقارنة الصحيحة
      if (q.fillExact) {
        item.fillExact = normalizeAnswer(q.fillExact);
        this.logger.debug(`[buildSnapshotItem] FILL - original fillExact: "${q.fillExact}", normalized: "${item.fillExact}"`);
      }
      if (q.regexList && q.regexList.length) item.regexList = q.regexList;
    }

    if (q.qType === 'match') {
      // match: answerKey يحتوي على أزواج [left, right]
      const matchKey = (q as any).answerKeyMatch;
      if (Array.isArray(matchKey)) {
        item.answerKeyMatch = matchKey;
      }
    }

    if (q.qType === 'reorder') {
      // reorder: answerKey يحتوي على ترتيب صحيح
      const reorderKey = (q as any).answerKeyReorder;
      if (Array.isArray(reorderKey)) {
        item.answerKeyReorder = reorderKey;
      }
    }

    // === Media snapshot ===
    const m: any = (q as any).media;
    if (m && m.key) {
      // لو الملف private على S3: اعمل presigned URL صالح لساعة
      item['mediaType'] = m.type;
      item['mediaUrl'] = await this.media.getPresignedUrl(m.key);
      item['mediaMime'] = m.mime;
    } else if (m && m.url) {
      // لو URL عام (مثلاً Cloudinary): استخدمه كما هو
      item['mediaType'] = m.type;
      item['mediaUrl'] = m.url;
      item['mediaMime'] = m.mime;
    }

    this.logger.debug(`[buildSnapshotItem] Item built - questionId: ${item.questionId}, qType: ${item.qType}, hasPrompt: ${!!item.promptSnapshot}, hasOptions: ${!!item.optionsText}, optionsCount: ${item.optionsText?.length || 0}`);
    return item;
  }

  async startAttempt(examIdStr: string, user: ReqUser) {
    this.ensureStudent(user);

    const userId = user.userId || (user as any).sub || (user as any).id;
    const studentId = new Types.ObjectId(userId);
    const examId = new Types.ObjectId(examIdStr);

    this.logger.log(`Starting attempt - examId: ${examIdStr}, userId: ${userId}, role: ${user.role}`);

    const exam = await this.ExamModel.findById(examId).lean(false).exec();
    if (!exam) {
      this.logger.warn(`Exam not found - examId: ${examIdStr}`);
      throw new BadRequestException({
        code: 'EXAM_NOT_FOUND',
        message: 'Exam not found',
        examId: examIdStr,
      });
    }

    this.logger.debug(`Exam found - title: ${exam.title}, provider: ${(exam as any).provider}, level: ${exam.level}, status: ${exam.status}`);

    // جلب معلومات الطالب (بما فيها state)
    const student = await this.UserModel.findById(userId).lean().exec();
    const studentState = (student as any)?.state;
    this.logger.debug(`Student state: ${studentState || 'not set'}`);

    if (exam.status !== ExamStatus.PUBLISHED) {
      this.logger.warn(`Exam is not published - examId: ${examIdStr}, status: ${exam.status}`);
      throw new BadRequestException({
        code: 'EXAM_NOT_AVAILABLE',
        message: 'Exam is not published or not found',
        examId: examIdStr,
        examStatus: exam.status,
      });
    }

    if (typeof exam.attemptLimit === 'number' && exam.attemptLimit > 0) {
      const current = await this.AttemptModel.countDocuments({ examId, studentId }).exec();
      if (current >= exam.attemptLimit) {
        this.logger.warn(`Attempt limit reached - examId: ${examIdStr}, userId: ${userId}, current: ${current}, limit: ${exam.attemptLimit}`);
        throw new BadRequestException({
          code: 'ATTEMPT_LIMIT_REACHED',
          message: 'Attempt limit reached',
          examId: examIdStr,
          currentAttempts: current,
          attemptLimit: exam.attemptLimit,
        });
      }
    }

    const attemptCount = await this.computeAttemptCount(studentId, examId);
    const seedNum = this.computeSeed(attemptCount, String(studentId), String(examId));
    const rng = mulberry32(seedNum);

    this.logger.log(`[startAttempt] Generating questions for exam - examId: ${examIdStr}, sections: ${exam.sections.length}, studentState: ${studentState || 'not set'}`);
    
    let picked: Array<{ question: QuestionDocument; points: number }>;
    try {
      picked = await this.generateQuestionListForAttempt(exam, rng, studentState);
      this.logger.log(`[startAttempt] Questions generated - count: ${picked.length}, examId: ${examIdStr}`);
    } catch (error: any) {
      this.logger.error(`[startAttempt] Error generating questions - examId: ${examIdStr}, error: ${error.message}, stack: ${error.stack}`);
      this.logger.error(`[startAttempt] Exam details - title: ${exam.title}, provider: ${(exam as any).provider}, level: ${exam.level}, sections: ${JSON.stringify(exam.sections.map((s: any) => ({ name: s.name, quota: s.quota, tags: s.tags, hasItems: Array.isArray(s.items) && s.items.length > 0 })))}`);
      
      // إذا كان الخطأ BadRequestException، نعيده كما هو
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // لأي خطأ آخر، نعيده مع معلومات إضافية
      throw new BadRequestException({
        code: 'QUESTION_GENERATION_FAILED',
        message: `Failed to generate questions for exam: ${error.message}`,
        examId: examIdStr,
        examTitle: exam.title,
        provider: (exam as any).provider,
        level: exam.level,
        studentState: studentState || null,
        sections: exam.sections.map((s: any) => ({
          name: s.name,
          quota: s.quota,
          tags: s.tags,
          hasItems: Array.isArray(s.items) && s.items.length > 0,
        })),
        originalError: error.message,
      });
    }
    
    if (!picked || !picked.length) {
      this.logger.error(`[startAttempt] No questions available - examId: ${examIdStr}, examTitle: ${exam.title}, provider: ${(exam as any).provider}, level: ${exam.level}, studentState: ${studentState || 'not set'}`);
      this.logger.error(`[startAttempt] Exam sections: ${JSON.stringify(exam.sections.map((s: any) => ({ name: s.name, quota: s.quota, tags: s.tags, items: s.items?.length || 0 })))}`);
      throw new BadRequestException({
        code: 'NO_QUESTIONS_AVAILABLE',
        message: 'No questions available for this exam',
        examId: examIdStr,
        examTitle: exam.title,
        provider: (exam as any).provider,
        level: exam.level,
        studentState: studentState || null,
        sections: exam.sections.map((s: any) => ({
          name: s.name,
          quota: s.quota,
          tags: s.tags,
          hasItems: Array.isArray(s.items) && s.items.length > 0,
        })),
      });
    }

    this.logger.log(`[startAttempt] Successfully generated ${picked.length} questions for attempt - examId: ${examIdStr}, userId: ${userId}`);

    // بناء items مع خلط الخيارات إذا كان السؤال MCQ
    this.logger.log(`[startAttempt] Building snapshot items - picked count: ${picked.length}`);
    const items: any[] = [];
    for (let i = 0; i < picked.length; i++) {
      const p = picked[i];
      this.logger.debug(`[startAttempt] Building item ${i + 1}/${picked.length} - questionId: ${p.question._id}, qType: ${p.question.qType}`);
      items.push(await this.buildSnapshotItem(p.question, p.points, rng));
    }
    this.logger.log(`[startAttempt] Built ${items.length} snapshot items`);

    let expiresAt: Date | undefined = undefined;
    if (typeof exam.timeLimitMin === 'number' && exam.timeLimitMin > 0) {
      expiresAt = new Date(Date.now() + exam.timeLimitMin * 60 * 1000);
    }

    const totalMaxScore = items.reduce((s, it) => s + (it.points || 0), 0);

    this.logger.log(`[startAttempt] Creating attempt - examId: ${examIdStr}, items count: ${items.length}, totalMaxScore: ${totalMaxScore}`);

    if (!items || items.length === 0) {
      this.logger.error(`[startAttempt] Cannot create attempt with empty items - examId: ${examIdStr}`);
      throw new BadRequestException({
        code: 'NO_ITEMS_IN_ATTEMPT',
        message: 'Cannot create attempt: no items were generated',
        examId: examIdStr,
        pickedCount: picked.length,
        itemsCount: items.length,
      });
    }

    const attempt = await this.AttemptModel.create({
      examId, studentId,
      status: AttemptStatus.IN_PROGRESS,
      attemptCount,
      randomSeed: seedNum,
      items,
      expiresAt,
      totalMaxScore,
    });

    this.logger.log(`[startAttempt] Attempt created successfully - attemptId: ${attempt._id}, items count: ${attempt.items.length}`);

    const responseItems = attempt.items.map((it: any) => ({
      questionId: it.questionId,
      qType: it.qType,
      points: it.points,
      prompt: it.promptSnapshot,
      options: it.optionsText,
      ...(it.mediaType && {
        mediaType: it.mediaType,
        mediaUrl: it.mediaUrl,
        mediaMime: it.mediaMime,
      }),
    }));

    this.logger.log(`[startAttempt] Response items count: ${responseItems.length}`);
    if (responseItems.length > 0) {
      this.logger.debug(`[startAttempt] First item sample: ${JSON.stringify({
        questionId: responseItems[0].questionId,
        qType: responseItems[0].qType,
        hasPrompt: !!responseItems[0].prompt,
        hasOptions: !!responseItems[0].options,
        optionsCount: responseItems[0].options?.length || 0,
      })}`);
    } else {
      this.logger.error(`[startAttempt] WARNING: Response items is empty! attempt.items.length: ${attempt.items.length}`);
    }

    const response = {
      attemptId: attempt._id,
      examId: attempt.examId,
      status: attempt.status,
      attemptCount: attempt.attemptCount,
      expiresAt: attempt.expiresAt,
      items: responseItems,
    };

    this.logger.log(`[startAttempt] Returning response with ${response.items.length} items`);
    return response;
  }

  /**
   * إنشاء Exam تمرين وبدء Attempt في خطوة واحدة (للطلاب)
   * - للاستخدام في قسم القواعد والتمارين
   * - يسمح للطالب بإنشاء تمرين والبدء في حله مباشرة
   */
  async startPracticeAttempt(dto: CreatePracticeExamDto, user: ReqUser) {
    this.ensureStudent(user);
    
    this.logger.log(`[startPracticeAttempt] Creating practice exam and starting attempt - userId: ${user.userId}, sections: ${dto?.sections?.length || 0}`);
    
    // 1. إنشاء Exam تمرين
    const exam = await this.examsService.createPracticeExam(dto, user);
    const examId = exam.id; // الآن مضمون أن يكون string
    
    this.logger.log(`[startPracticeAttempt] Practice exam created - examId: ${examId}, title: ${exam.title}`);
    
    // 2. بدء Attempt على هذا Exam
    const attempt = await this.startAttempt(examId, user);
    
    this.logger.log(`[startPracticeAttempt] Attempt started - attemptId: ${attempt.attemptId}, examId: ${examId}`);
    
    return attempt;
  }

  private findItemIndex(attempt: AttemptDocument, input: { itemIndex?: number; questionId?: string }) {
    if (typeof input.itemIndex === 'number') {
      if (input.itemIndex < 0 || input.itemIndex >= attempt.items.length) {
        throw new BadRequestException('Invalid item index');
      }
      return input.itemIndex;
    }

    if (input.questionId) {
      const idx = attempt.items.findIndex(it => String(it.questionId) === input.questionId);
      if (idx === -1) throw new NotFoundException('Question not found in attempt');
      return idx;
    }

    throw new BadRequestException('Provide itemIndex or questionId');
  }

  async saveAnswer(user: ReqUser, attemptIdStr: string, payload: {
    itemIndex?: number; questionId?: string;
    studentAnswerIndexes?: number[]; studentAnswerText?: string; studentAnswerBoolean?: boolean;
    studentAnswerMatch?: [string, string][]; studentAnswerReorder?: string[];
    studentAnswerAudioKey?: string;
  }) {
    this.logger.log(`[saveAnswer] Starting - attemptId: ${attemptIdStr}, itemIndex: ${payload.itemIndex}, questionId: ${payload.questionId}`);
    
    this.ensureStudent(user);

    const userId = user.userId || (user as any).sub || (user as any).id;
    const attempt = await this.AttemptModel.findById(attemptIdStr).exec();
    if (!attempt) {
      this.logger.error(`[saveAnswer] Attempt not found - attemptId: ${attemptIdStr}`);
      throw new NotFoundException('Attempt not found');
    }

    if (attempt.studentId.toString() !== userId) {
      this.logger.error(`[saveAnswer] Forbidden - attempt.studentId: ${attempt.studentId}, userId: ${userId}`);
      throw new ForbiddenException('Not authorized to modify this attempt');
    }
    
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      this.logger.error(`[saveAnswer] Attempt is not in progress - status: ${attempt.status}`);
      throw new ForbiddenException('Attempt is not in progress');
    }

    if (attempt.expiresAt && attempt.expiresAt.getTime() < Date.now()) {
      this.logger.error(`[saveAnswer] Time is over - expiresAt: ${attempt.expiresAt}, now: ${new Date()}`);
      throw new ForbiddenException('Time is over');
    }

    this.logger.debug(`[saveAnswer] Attempt found - items count: ${attempt.items.length}, status: ${attempt.status}`);
    
    const idx = this.findItemIndex(attempt, payload);
    this.logger.debug(`[saveAnswer] Item index found: ${idx}, qType: ${(attempt.items[idx] as any)?.qType}`);
    
    const it: any = attempt.items[idx];

    if (it.qType === 'mcq') {
      if (!Array.isArray(payload.studentAnswerIndexes)) {
        this.logger.error(`[saveAnswer] Invalid payload for MCQ - studentAnswerIndexes: ${JSON.stringify(payload.studentAnswerIndexes)}, type: ${typeof payload.studentAnswerIndexes}`);
        throw new BadRequestException({
          code: 'INVALID_MCQ_ANSWER',
          message: 'Provide studentAnswerIndexes as array for MCQ',
          received: payload.studentAnswerIndexes,
          qType: it.qType,
        });
      }
      this.logger.debug(`[saveAnswer] Saving MCQ answer - itemIndex: ${idx}, questionId: ${it.questionId}, correctOptionIndexes: [${(it.correctOptionIndexes || []).join(', ')}], studentAnswerIndexes: [${payload.studentAnswerIndexes.join(', ')}]`);
      it.studentAnswerIndexes = payload.studentAnswerIndexes;
    } else if (it.qType === 'fill') {
      // تطبيع الإجابة عند الحفظ (إزالة مسافات زائدة، \n، \r، tabs)
      it.studentAnswerText = normalizeAnswer(payload.studentAnswerText || '');
      this.logger.debug(`[saveAnswer] Saving FILL answer - itemIndex: ${idx}, questionId: ${it.questionId}, original: "${payload.studentAnswerText}", normalized: "${it.studentAnswerText}", fillExact: "${it.fillExact}"`);
    } else if (it.qType === 'true_false') {
      // تحويل string إلى boolean إذا لزم الأمر (للتوافق مع Frontend)
      let studentAnswer: boolean;
      // استخدام any للتغلب على مشكلة TypeScript type narrowing
      const answerValue: any = payload.studentAnswerBoolean;
      
      if (typeof answerValue === 'boolean') {
        studentAnswer = answerValue;
      } else if (typeof answerValue === 'string') {
        // تحويل "true"/"false" strings إلى boolean
        studentAnswer = answerValue.toLowerCase() === 'true';
        this.logger.warn(`[saveAnswer] TRUE_FALSE received string instead of boolean - itemIndex: ${idx}, questionId: ${it.questionId}, received: "${answerValue}", converted to: ${studentAnswer}`);
      } else if (answerValue === null || answerValue === undefined) {
        throw new BadRequestException('Provide studentAnswerBoolean for true_false');
      } else {
        // تحويل أي قيمة أخرى إلى boolean
        studentAnswer = Boolean(answerValue);
        this.logger.warn(`[saveAnswer] TRUE_FALSE received unexpected type - itemIndex: ${idx}, questionId: ${it.questionId}, type: ${typeof answerValue}, value: ${answerValue}, converted to: ${studentAnswer}`);
      }
      it.studentAnswerBoolean = studentAnswer;
      this.logger.debug(`[saveAnswer] Saving TRUE_FALSE answer - itemIndex: ${idx}, questionId: ${it.questionId}, answerKeyBoolean: ${it.answerKeyBoolean}, studentAnswerBoolean: ${it.studentAnswerBoolean}`);
    } else if (it.qType === 'match') {
      if (!Array.isArray(payload.studentAnswerMatch)) {
        throw new BadRequestException('Provide studentAnswerMatch for MATCH');
      }
      it.studentAnswerMatch = payload.studentAnswerMatch;
    } else if (it.qType === 'reorder') {
      if (!Array.isArray(payload.studentAnswerReorder)) {
        throw new BadRequestException('Provide studentAnswerReorder for REORDER');
      }
      it.studentAnswerReorder = payload.studentAnswerReorder;
    } else if (it.qType === 'speak' || (it.qType === 'fill' && payload.studentAnswerAudioKey)) {
      // Sprechen: حفظ مفتاح الملف الصوتي
      if (payload.studentAnswerAudioKey) {
        it.studentAnswerAudioKey = payload.studentAnswerAudioKey;
        // يمكن إنشاء presigned URL هنا إذا لزم الأمر
      }
    }

    await attempt.save();
    this.logger.log(`[saveAnswer] Answer saved successfully - attemptId: ${attemptIdStr}, itemIndex: ${idx}, qType: ${it.qType}`);
    return { ok: true };
  }

  private normalizeText(s: string) {
    return normalizeAnswer(s);
  }

  private scoreItem(it: any) {
    let auto = 0;

    if (it.qType === 'mcq') {
      const correct = new Set<number>(it.correctOptionIndexes || []);
      const ans = new Set<number>(it.studentAnswerIndexes || []);

      this.logger.debug(`[scoreItem] MCQ scoring - questionId: ${it.questionId}, correctIndexes: [${Array.from(correct).join(', ')}], studentIndexes: [${Array.from(ans).join(', ')}], points: ${it.points}, optionsText: [${(it.optionsText || []).join(', ')}]`);

      if (correct.size <= 1) {
        // إصلاح: استخدام Array.from بدلاً من [...ans][0] لأن Set لا يدعم spread operator بهذه الطريقة
        const studentAnswerValue = ans.size > 0 ? Array.from(ans)[0] : undefined;
        auto = studentAnswerValue !== undefined && correct.has(studentAnswerValue) ? it.points : 0;
        this.logger.debug(`[scoreItem] MCQ single correct - studentAnswerValue: ${studentAnswerValue}, isCorrect: ${correct.has(studentAnswerValue || -1)}, score: ${auto}`);
      } else {
        const intersect = Array.from(ans).filter(a => correct.has(a)).length;
        const fraction = (correct.size === 0) ? 0 : intersect / correct.size;
        auto = Math.round(it.points * fraction * 1000) / 1000;
        this.logger.debug(`[scoreItem] MCQ multiple correct - intersect: ${intersect}, fraction: ${fraction}, score: ${auto}`);
      }
    }

    if (it.qType === 'true_false') {
      if (typeof it.answerKeyBoolean === 'boolean' && typeof it.studentAnswerBoolean === 'boolean') {
        auto = it.answerKeyBoolean === it.studentAnswerBoolean ? it.points : 0;
        this.logger.debug(`[scoreItem] TRUE_FALSE scoring - questionId: ${it.questionId}, answerKeyBoolean: ${it.answerKeyBoolean}, studentAnswerBoolean: ${it.studentAnswerBoolean}, match: ${it.answerKeyBoolean === it.studentAnswerBoolean}, score: ${auto}`);
      } else {
        this.logger.warn(`[scoreItem] TRUE_FALSE scoring failed - questionId: ${it.questionId}, answerKeyBoolean type: ${typeof it.answerKeyBoolean}, value: ${it.answerKeyBoolean}, studentAnswerBoolean type: ${typeof it.studentAnswerBoolean}, value: ${it.studentAnswerBoolean}`);
      }
    }

    if (it.qType === 'fill') {
      // تطبيع إجابة الطالب
      const ans = normalizeAnswer(it.studentAnswerText || '');
      
      // دعم fillExact كـ string أو array
      const exactList = Array.isArray(it.fillExact)
        ? it.fillExact.map((e: string) => normalizeAnswer(e))
        : it.fillExact
        ? [normalizeAnswer(it.fillExact)]
        : [];
      
      this.logger.debug(`[scoreItem] FILL scoring - questionId: ${it.questionId}, studentAnswer: "${it.studentAnswerText}", normalized: "${ans}", fillExact: ${JSON.stringify(it.fillExact)}, normalizedExactList: [${exactList.map(e => `"${e}"`).join(', ')}]`);
      
      const exactHit = exactList.length > 0 && exactList.includes(ans);
      
      const regexHit = Array.isArray(it.regexList)
        ? it.regexList.some((rx: string) => {
            try {
              const reg = new RegExp(rx, 'i');
              const matches = reg.test(ans);
              this.logger.debug(`[scoreItem] FILL regex test - regex: "${rx}", answer: "${ans}", matches: ${matches}`);
              return matches;
            } catch (error) {
              this.logger.error(`[scoreItem] FILL regex error - regex: "${rx}", error: ${error}`);
              return false;
            }
          })
        : false;

      auto = exactHit || regexHit ? it.points : 0;
      this.logger.debug(`[scoreItem] FILL result - exactHit: ${exactHit}, regexHit: ${regexHit}, score: ${auto}`);
    }

    if (it.qType === 'match') {
      // match: مقارنة أزواج [left, right]
      const correct = new Map<string, string>();
      const answerKeyMatch = it.answerKeyMatch || [];
      answerKeyMatch.forEach((pair: [string, string]) => {
        if (Array.isArray(pair) && pair.length === 2) {
          correct.set(pair[0], pair[1]);
        }
      });

      const studentMatch = it.studentAnswerMatch || [];
      let correctPairs = 0;
      let totalPairs = correct.size;

      if (totalPairs > 0) {
        studentMatch.forEach((pair: [string, string]) => {
          if (Array.isArray(pair) && pair.length === 2) {
            const [left, right] = pair;
            if (correct.has(left) && correct.get(left) === right) {
              correctPairs++;
            }
          }
        });
        const fraction = correctPairs / totalPairs;
        auto = Math.round(it.points * fraction * 1000) / 1000;
      } else {
        auto = 0;
      }
    }

    if (it.qType === 'reorder') {
      // reorder: مقارنة الترتيب
      const correct = it.answerKeyReorder || [];
      const student = it.studentAnswerReorder || [];

      if (correct.length === 0 || student.length === 0 || correct.length !== student.length) {
        auto = 0;
      } else {
        let correctPositions = 0;
        for (let i = 0; i < correct.length; i++) {
          if (correct[i] === student[i]) {
            correctPositions++;
          }
        }
        const fraction = correctPositions / correct.length;
        auto = Math.round(it.points * fraction * 1000) / 1000;
      }
    }

    it.autoScore = auto;
    return auto;
  }

  async submitAttempt(user: ReqUser, attemptIdStr: string, answers?: Array<{ itemId?: string; itemIndex?: number; userAnswer?: any }>) {
    this.ensureStudent(user);

    const userId = user.userId || (user as any).sub || (user as any).id;
    const attempt = await this.AttemptModel.findById(attemptIdStr).exec();
    if (!attempt) throw new NotFoundException('Attempt not found');

    if (attempt.studentId.toString() !== userId) throw new ForbiddenException();
    if (attempt.status !== AttemptStatus.IN_PROGRESS) throw new ForbiddenException('Already submitted');

    // إذا تم إرسال answers في body، احفظها أولاً
    if (answers && Array.isArray(answers) && answers.length > 0) {
      this.logger.log(`[submitAttempt] Saving ${answers.length} answers from request body`);
      
      for (let answerIndex = 0; answerIndex < answers.length; answerIndex++) {
        const answer = answers[answerIndex];
        
        // محاولة البحث عن item
        let item: any = null;
        let itemIndex: number = -1;
        
        // الأولوية: itemIndex (الأكثر دقة)
        if (answer.itemIndex !== undefined && typeof answer.itemIndex === 'number') {
          const idx = answer.itemIndex;
          if (idx >= 0 && idx < (attempt.items as any[]).length) {
            item = (attempt.items as any[])[idx];
            itemIndex = idx;
            this.logger.debug(`[submitAttempt] Found item using itemIndex: ${idx}`);
          } else {
            this.logger.warn(`[submitAttempt] Invalid itemIndex: ${idx}, items count: ${(attempt.items as any[]).length}`);
          }
        }
        
        // الثاني: itemId (questionId أو index كـ string)
        if (!item && answer.itemId) {
          // البحث باستخدام questionId
          const foundIndex = (attempt.items as any[]).findIndex((it: any) => 
            it.questionId?.toString() === answer.itemId
          );
          
          if (foundIndex >= 0) {
            item = (attempt.items as any[])[foundIndex];
            itemIndex = foundIndex;
            this.logger.debug(`[submitAttempt] Found item using questionId: ${answer.itemId} at index ${foundIndex}`);
          } else {
            // محاولة البحث باستخدام index (itemId كرقم)
            const parsedIndex = parseInt(answer.itemId, 10);
            if (!isNaN(parsedIndex) && parsedIndex >= 0 && parsedIndex < (attempt.items as any[]).length) {
              item = (attempt.items as any[])[parsedIndex];
              itemIndex = parsedIndex;
              this.logger.debug(`[submitAttempt] Found item using itemId as index: ${parsedIndex}`);
            }
          }
        }
        
        // الأخير: استخدام answerIndex (فقط إذا لم نجد item) - ⚠️ قد يكون غير دقيق
        if (!item && answerIndex < (attempt.items as any[]).length) {
          item = (attempt.items as any[])[answerIndex];
          itemIndex = answerIndex;
          this.logger.warn(`[submitAttempt] Using answerIndex ${answerIndex} as itemIndex - this may be incorrect if answers are not in order!`);
        }
        
        if (item) {
          this.saveAnswerToItem(item, answer.userAnswer);
          this.logger.debug(`[submitAttempt] Saved answer ${answerIndex} for itemIndex ${itemIndex} (questionId: ${item.questionId}, qType: ${item.qType}, prompt: "${item.promptSnapshot?.substring(0, 50)}...") - userAnswer: ${JSON.stringify(answer.userAnswer)}`);
        } else {
          this.logger.error(`[submitAttempt] Could not find item for answer ${answerIndex}: ${JSON.stringify(answer)}. Available items count: ${(attempt.items as any[]).length}`);
        }
      }
      
      await attempt.save();
    }

    const now = Date.now();
    attempt.submittedAt = new Date(now);
    attempt.timeUsedSec = Math.max(0, Math.floor((now - attempt.startedAt.getTime()) / 1000));
    attempt.status = AttemptStatus.SUBMITTED;

    let totalAuto = 0;
    let totalMax = 0;
    for (let i = 0; i < (attempt.items as any[]).length; i++) {
      const it = (attempt.items as any[])[i];
      
      // Log تفصيلي قبل التصحيح
      this.logger.debug(`[submitAttempt] Before scoring Item ${i} - questionId: ${it.questionId}, qType: ${it.qType}, studentAnswerText: "${it.studentAnswerText}", studentAnswerBoolean: ${it.studentAnswerBoolean}, studentAnswerIndexes: [${(it.studentAnswerIndexes || []).join(', ')}]`);
      
      const itemScore = this.scoreItem(it);
      totalAuto += itemScore;
      totalMax  += it.points || 0;
      this.logger.debug(`[submitAttempt] Item ${i} (questionId: ${it.questionId}, qType: ${it.qType}) - score: ${itemScore}/${it.points || 0}, totalAuto: ${totalAuto}, totalMax: ${totalMax}`);
    }

    attempt.totalAutoScore = Math.round(totalAuto * 1000) / 1000;
    attempt.totalMaxScore  = totalMax;
    attempt.finalScore     = attempt.totalAutoScore + (attempt.totalManualScore || 0);

    await attempt.save();

    const percentage = totalMax > 0 ? Math.round((attempt.totalAutoScore / totalMax) * 100) : 0;

    this.logger.log(`[submitAttempt] Attempt submitted - attemptId: ${attemptIdStr}, totalAutoScore: ${attempt.totalAutoScore}, totalMaxScore: ${totalMax}, percentage: ${percentage}%`);

    // بناء items مع isCorrect و correctAnswer
    const items = (attempt.items as any[]).map(it => {
      const itemResult: any = {
        questionId: it.questionId,
        itemIndex: (attempt.items as any[]).indexOf(it),
        qType: it.qType,
        points: it.points,
        prompt: it.promptSnapshot,
        autoScore: it.autoScore || 0,
        isCorrect: (it.autoScore || 0) >= (it.points || 0), // صحيح إذا حصل على كامل النقاط
      };

      // إضافة الإجابة الصحيحة حسب نوع السؤال
      if (it.qType === 'mcq') {
        itemResult.studentAnswerIndexes = it.studentAnswerIndexes;
        itemResult.options = it.optionsText;
        itemResult.correctOptionIndexes = it.correctOptionIndexes;
        // إضافة correctAnswer كنص (من optionsText)
        if (Array.isArray(it.optionsText) && Array.isArray(it.correctOptionIndexes)) {
          itemResult.correctAnswer = it.correctOptionIndexes.map((idx: number) => it.optionsText[idx]).join(', ');
        }
      } else if (it.qType === 'true_false') {
        itemResult.studentAnswerBoolean = it.studentAnswerBoolean;
        itemResult.correctAnswer = it.answerKeyBoolean;
      } else if (it.qType === 'fill') {
        itemResult.studentAnswerText = it.studentAnswerText;
        itemResult.correctAnswer = it.fillExact || (it.regexList && it.regexList[0]) || '';
      } else if (it.qType === 'match') {
        itemResult.studentAnswerMatch = it.studentAnswerMatch;
        itemResult.correctAnswer = it.answerKeyMatch;
      } else if (it.qType === 'reorder') {
        itemResult.studentAnswerReorder = it.studentAnswerReorder;
        itemResult.correctAnswer = it.answerKeyReorder;
      }

      return itemResult;
    });

    return {
      attemptId: attempt._id,
      status: attempt.status,
      totalAutoScore: attempt.totalAutoScore,
      totalMaxScore: attempt.totalMaxScore,
      finalScore: attempt.finalScore,
      percentage: percentage,
      items: items, // إضافة items مع النتائج
    };
  }

  private saveAnswerToItem(item: any, userAnswer: any) {
    if (item.qType === 'fill') {
      item.studentAnswerText = normalizeAnswer(userAnswer || '');
      this.logger.debug(`[saveAnswerToItem] FILL - questionId: ${item.questionId}, userAnswer: "${userAnswer}", normalized: "${item.studentAnswerText}"`);
    } else if (item.qType === 'true_false') {
      // تحويل string إلى boolean إذا لزم الأمر
      if (typeof userAnswer === 'boolean') {
        item.studentAnswerBoolean = userAnswer;
      } else if (typeof userAnswer === 'string') {
        const lower = userAnswer.toLowerCase().trim();
        // دعم "richtig"/"falsch" (ألماني) و "true"/"false" (إنجليزي) و "صح"/"خطأ" (عربي)
        const trueValues = ['true', 'richtig', 'صح', '1', 'yes', 'ja', 'نعم'];
        const falseValues = ['false', 'falsch', 'خطأ', '0', 'no', 'nein', 'لا'];
        
        if (trueValues.includes(lower)) {
          item.studentAnswerBoolean = true;
        } else if (falseValues.includes(lower)) {
          item.studentAnswerBoolean = false;
        } else {
          // افتراضي: Boolean conversion
          item.studentAnswerBoolean = Boolean(userAnswer);
          this.logger.warn(`[saveAnswerToItem] TRUE_FALSE - Unknown string value: "${userAnswer}", converted to: ${item.studentAnswerBoolean}`);
        }
        this.logger.debug(`[saveAnswerToItem] TRUE_FALSE - questionId: ${item.questionId}, userAnswer: "${userAnswer}", converted to: ${item.studentAnswerBoolean}`);
      } else {
        item.studentAnswerBoolean = Boolean(userAnswer);
        this.logger.debug(`[saveAnswerToItem] TRUE_FALSE - questionId: ${item.questionId}, userAnswer: ${userAnswer} (${typeof userAnswer}), converted to: ${item.studentAnswerBoolean}`);
      }
    } else if (item.qType === 'mcq') {
      if (Array.isArray(userAnswer)) {
        item.studentAnswerIndexes = userAnswer;
      } else if (typeof userAnswer === 'number') {
        item.studentAnswerIndexes = [userAnswer];
      } else if (typeof userAnswer === 'string') {
        // محاولة تحويل string إلى number أولاً
        const num = parseInt(userAnswer, 10);
        if (!isNaN(num)) {
          item.studentAnswerIndexes = [num];
        } else {
          // إذا لم يكن رقم، ابحث عن النص في optionsText
          const optionsText = item.optionsText || [];
          const index = optionsText.findIndex((opt: string) => {
            const normalizedOpt = normalizeAnswer(opt);
            const normalizedAnswer = normalizeAnswer(userAnswer);
            return normalizedOpt === normalizedAnswer;
          });
          if (index >= 0) {
            item.studentAnswerIndexes = [index];
            this.logger.debug(`[saveAnswerToItem] MCQ - Found text "${userAnswer}" at index ${index} in options: [${optionsText.join(', ')}]`);
          } else {
            this.logger.warn(`[saveAnswerToItem] MCQ - Could not find text "${userAnswer}" in options: [${optionsText.join(', ')}]. Available options: ${optionsText.map((opt, idx) => `[${idx}]: "${opt}"`).join(', ')}`);
          }
        }
      }
      this.logger.debug(`[saveAnswerToItem] MCQ - questionId: ${item.questionId}, userAnswer: ${JSON.stringify(userAnswer)}, studentAnswerIndexes: [${(item.studentAnswerIndexes || []).join(', ')}]`);
    }
  }

  async gradeAttempt(user: ReqUser, attemptIdStr: string, items: { questionId: string; score: number }[]) {
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) throw new ForbiddenException();

    const attempt = await this.AttemptModel.findById(attemptIdStr).exec();
    if (!attempt) throw new NotFoundException('Attempt not found');

    const exam = await this.ExamModel.findById(attempt.examId).lean().exec();
    if (!exam) throw new NotFoundException('Exam not found');

    const userId = user.userId || (user as any).sub || (user as any).id;
    const isOwner = String(exam.ownerId) === userId;
    const isAdmin = user.role === 'admin';

    if (!(isOwner || isAdmin)) throw new ForbiddenException('Not allowed to grade this attempt');

    if (attempt.status !== AttemptStatus.SUBMITTED && attempt.status !== AttemptStatus.GRADED) {
      throw new BadRequestException('Attempt must be submitted to grade');
    }

    const scoreMap = new Map(items.map(i => [i.questionId, i.score] as [string, number]));
    
    for (const it of attempt.items as any[]) {
      if (scoreMap.has(String(it.questionId))) {
        it.manualScore = scoreMap.get(String(it.questionId)) || 0;
      }
    }

    attempt.totalManualScore = (attempt.items as any[]).reduce((s, it) => s + (it.manualScore || 0), 0);
    attempt.finalScore = attempt.totalAutoScore + attempt.totalManualScore;
    attempt.status = AttemptStatus.GRADED;

    await attempt.save();

    return { attemptId: attempt._id, finalScore: attempt.finalScore, status: attempt.status };
  }

  private buildViewForUser(attempt: AttemptDocument, exam: any, user: ReqUser) {
    const policy = (exam && exam.resultsPolicy) || 'only_scores';

    const base = {
      attemptId: attempt._id,
      examId: attempt.examId,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      timeUsedSec: attempt.timeUsedSec,
      totalMaxScore: attempt.totalMaxScore,
      totalAutoScore: attempt.totalAutoScore,
      totalManualScore: attempt.totalManualScore,
      finalScore: attempt.finalScore,
    };

    if (user.role === 'teacher' || user.role === 'admin') {
      return {
        ...base,
        items: (attempt.items as any[]).map(it => ({
          questionId: it.questionId,
          qType: it.qType,
          points: it.points,
          prompt: it.promptSnapshot,
          options: it.optionsText,
          studentAnswerIndexes: it.studentAnswerIndexes,
          studentAnswerText: it.studentAnswerText,
          studentAnswerBoolean: it.studentAnswerBoolean,
          correctOptionIndexes: it.correctOptionIndexes,
          answerKeyBoolean: it.answerKeyBoolean,
          fillExact: it.fillExact,
          regexList: it.regexList,
          answerKeyMatch: it.answerKeyMatch,
          answerKeyReorder: it.answerKeyReorder,
          studentAnswerMatch: it.studentAnswerMatch,
          studentAnswerReorder: it.studentAnswerReorder,
          autoScore: it.autoScore,
          manualScore: it.manualScore,
        })),
      };
    }

    if (policy === 'release_delayed' && !attempt.released) {
      return { ...base, message: 'سيتم إعلان النتائج لاحقًا.' };
    }

    // إذا كانت المحاولة في حالة in_progress، يجب إرجاع items حتى يتمكن الطالب من الإجابة
    if (attempt.status === AttemptStatus.IN_PROGRESS) {
      return {
        ...base,
        items: (attempt.items as any[]).map(it => ({
          questionId: it.questionId,
          qType: it.qType,
          points: it.points,
          prompt: it.promptSnapshot,
          options: it.optionsText,
          ...(it.mediaType && {
            mediaType: it.mediaType,
            mediaUrl: it.mediaUrl,
            mediaMime: it.mediaMime,
          }),
        })),
      };
    }

    if (policy === 'only_scores') {
      return { ...base };
    }

    if (policy === 'correct_with_scores') {
      return {
        ...base,
        items: (attempt.items as any[]).map(it => ({
          questionId: it.questionId,
          qType: it.qType,
          points: it.points,
          prompt: it.promptSnapshot,
          options: it.optionsText,
          studentAnswerIndexes: it.studentAnswerIndexes,
          studentAnswerText: it.studentAnswerText,
          studentAnswerBoolean: it.studentAnswerBoolean,
          studentAnswerMatch: it.studentAnswerMatch,
          studentAnswerReorder: it.studentAnswerReorder,
          correctOptionIndexes: it.correctOptionIndexes,
          answerKeyBoolean: it.answerKeyBoolean,
          fillExact: it.fillExact, // الإجابة الصحيحة لأسئلة FILL
          regexList: it.regexList, // قائمة regex patterns لأسئلة FILL
          answerKeyMatch: it.answerKeyMatch,
          answerKeyReorder: it.answerKeyReorder,
          autoScore: it.autoScore,
          manualScore: it.manualScore,
        })),
      };
    }

    if (policy === 'explanations_with_scores') {
      return {
        ...base,
        items: (attempt.items as any[]).map(it => ({
          questionId: it.questionId,
          qType: it.qType,
          points: it.points,
          prompt: it.promptSnapshot,
          options: it.optionsText,
          studentAnswerIndexes: it.studentAnswerIndexes,
          studentAnswerText: it.studentAnswerText,
          studentAnswerBoolean: it.studentAnswerBoolean,
          studentAnswerMatch: it.studentAnswerMatch,
          studentAnswerReorder: it.studentAnswerReorder,
          correctOptionIndexes: it.correctOptionIndexes,
          answerKeyBoolean: it.answerKeyBoolean,
          fillExact: it.fillExact, // الإجابة الصحيحة لأسئلة FILL
          regexList: it.regexList, // قائمة regex patterns لأسئلة FILL
          answerKeyMatch: it.answerKeyMatch,
          answerKeyReorder: it.answerKeyReorder,
          autoScore: it.autoScore,
          manualScore: it.manualScore,
        })),
      };
    }

    return { ...base };
  }

  async getAttempt(user: ReqUser, attemptIdStr: string) {
    const attempt = await this.AttemptModel.findById(attemptIdStr).exec();
    if (!attempt) throw new NotFoundException('Attempt not found');

    const userId = user.userId || (user as any).sub || (user as any).id;

    if (user.role === 'student') {
      if (attempt.studentId.toString() !== userId) throw new ForbiddenException();
    } else if (user.role === 'teacher') {
      const exam = await this.ExamModel.findById(attempt.examId).lean().exec();
      if (!exam) throw new NotFoundException('Exam not found');
      if (String(exam.ownerId) !== userId) throw new ForbiddenException();
      return this.buildViewForUser(attempt, exam, user);
    } else if (user.role === 'admin') {
      const exam = await this.ExamModel.findById(attempt.examId).lean().exec();
      return this.buildViewForUser(attempt, exam, user);
    }

    const exam = await this.ExamModel.findById(attempt.examId).lean().exec();
    return this.buildViewForUser(attempt, exam, user);
  }

  async findByStudent(user: ReqUser, examId?: string) {
    this.ensureStudent(user);

    const userId = user.userId || (user as any).sub || (user as any).id;
    const studentId = new Types.ObjectId(userId);

    const filter: any = { studentId };
    if (examId) {
      filter.examId = new Types.ObjectId(examId);
    }

    const attempts = await this.AttemptModel.find(filter)
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    // جلب معلومات الامتحانات
    const examIds = [...new Set(attempts.map((a: any) => a.examId.toString()))];
    const exams = await this.ExamModel.find({ _id: { $in: examIds } })
      .lean()
      .exec();
    const examMap = new Map(exams.map((e: any) => [e._id.toString(), e]));

    return attempts.map((attempt: any) => {
      const exam = examMap.get(attempt.examId.toString());
      return {
        id: attempt._id,
        examId: attempt.examId,
        examTitle: exam?.title || 'Unknown',
        examLevel: exam?.level,
        examProvider: exam?.provider,
        status: attempt.status,
        score: attempt.totalScore || 0,
        totalPoints: attempt.totalMaxScore || 0,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        attemptCount: attempt.attemptCount,
      };
    });
  }
}

