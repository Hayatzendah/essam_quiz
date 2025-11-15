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
  ) {}

  private async computeAttemptCount(studentId: Types.ObjectId, examId: Types.ObjectId) {
    const count = await this.AttemptModel.countDocuments({ studentId, examId }).exec();
    return count + 1;
  }

  private computeSeed(attemptCount: number, studentId: string, examId: string) {
    return seedFrom(examId, studentId, attemptCount);
  }

  private ensureStudent(user: ReqUser) {
    if (!user || user.role !== 'student') throw new ForbiddenException('Only student can perform this action');
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
    const selected: Array<{ question: QuestionDocument; points: number }> = [];

    for (const sec of exam.sections) {
      const hasItems = Array.isArray((sec as any).items) && (sec as any).items.length > 0;
      const hasQuota = typeof (sec as any).quota === 'number' && (sec as any).quota > 0;

      this.logger.debug(`Processing section: ${sec.name}, hasItems: ${hasItems}, hasQuota: ${hasQuota}, quota: ${(sec as any).quota}`);

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
        // و studentState موجود، نضيف الولاية للفلترة
        const examProvider = (exam as any).provider?.toLowerCase();
        if (studentState && (examProvider === 'deutschland-in-leben' || examProvider === 'lid')) {
          // إذا كان section يحتوي على tags للولاية (مثل ["Bayern"] أو ["300-Fragen"])
          // نستخدم studentState فقط إذا كان section مخصص للولاية
          const isStateSection = sectionTags.some(tag => 
            ['Bayern', 'Berlin', 'NRW', 'Baden-Württemberg', 'Brandenburg', 'Bremen', 
             'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen', 
             'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen', 
             'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen'].includes(tag)
          );
          
          if (isStateSection) {
            // استبدال tags الولاية بـ studentState
            const filteredTags = sectionTags.filter(tag => 
              !['Bayern', 'Berlin', 'NRW', 'Baden-Württemberg', 'Brandenburg', 'Bremen', 
                'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen', 
                'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen', 
                'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen'].includes(tag)
            );
            sectionTags.length = 0;
            sectionTags.push(...filteredTags, studentState);
            this.logger.debug(`State section detected - using studentState: ${studentState} for section: ${sec.name}`);
          }
        }
        
        if (sectionTags.length > 0) {
          filter.tags = { $in: sectionTags };
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
          
          // البحث عن جميع الأسئلة المنشورة لنفس المستوى (بدون provider) لمعرفة ما هو موجود
          const allPublishedForLevel = await this.QuestionModel.find({ 
            status: QuestionStatus.PUBLISHED,
            level: exam.level 
          }).lean(false).limit(10).exec();
          
          // البحث عن جميع الأسئلة المنشورة (بدون أي فلترة) لمعرفة ما هو موجود
          const allPublished = await this.QuestionModel.find({ 
            status: QuestionStatus.PUBLISHED 
          }).lean(false).limit(10).exec();
          
          this.logger.error(`No questions found for section - section: ${sec.name}`);
          this.logger.error(`Filter used: ${JSON.stringify(filter)}`);
          this.logger.error(`Questions found without tags filter: ${candidatesWithoutTags.length}`);
          this.logger.error(`Total published questions for level "${exam.level}": ${allPublishedForLevel.length}`);
          this.logger.error(`Total published questions (any level): ${allPublished.length}`);
          
          if (candidatesWithoutTags.length > 0) {
            this.logger.error(`Sample question tags: ${JSON.stringify(candidatesWithoutTags.slice(0, 3).map((q: any) => ({ id: q._id, tags: q.tags, provider: q.provider, level: q.level })))}`);
          }
          
          if (allPublishedForLevel.length > 0) {
            this.logger.error(`Sample questions for level "${exam.level}": ${JSON.stringify(allPublishedForLevel.slice(0, 5).map((q: any) => ({ 
              id: q._id, 
              provider: q.provider, 
              level: q.level, 
              tags: q.tags,
              status: q.status 
            })))}`);
          }
          
          if (allPublished.length > 0) {
            this.logger.error(`Sample published questions (any level): ${JSON.stringify(allPublished.slice(0, 5).map((q: any) => ({ 
              id: q._id, 
              provider: q.provider, 
              level: q.level, 
              tags: q.tags,
              status: q.status 
            })))}`);
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

    if (exam.randomizeQuestions) shuffleInPlace(selected, rng);
    this.logger.log(`Total questions selected: ${selected.length} for exam: ${exam.title}`);
    return selected;
  }

  private async buildSnapshotItem(q: QuestionDocument, points: number, rng?: () => number) {
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
        const shuffled = [...options];
        shuffleInPlace(shuffled, rng);
        item.optionsText = shuffled.map(o => o.text);
        // حساب correctOptionIndexes الجديدة بعد الخلط
        const newCorrectIdxs: number[] = [];
        shuffled.forEach((opt, newIdx) => {
          const originalIdx = options.findIndex(o => o.text === opt.text && o.isCorrect === opt.isCorrect);
          if (originalCorrectIdxs.includes(originalIdx)) {
            newCorrectIdxs.push(newIdx);
          }
        });
        item.correctOptionIndexes = newCorrectIdxs;
        item.optionOrder = shuffled.map((_, newIdx) => {
          const originalIdx = options.findIndex(o => o.text === shuffled[newIdx].text);
          return originalIdx;
        });
      } else {
        item.optionsText = options.map(o => o.text);
        item.correctOptionIndexes = originalCorrectIdxs;
      }
    }

    if (q.qType === 'true_false') {
      item.answerKeyBoolean = (q as any).answerKeyBoolean;
    }

    if (q.qType === 'fill') {
      if (q.fillExact) item.fillExact = q.fillExact;
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

    const picked = await this.generateQuestionListForAttempt(exam, rng, studentState);
    if (!picked.length) {
      this.logger.error(`No questions available - examId: ${examIdStr}, examTitle: ${exam.title}, provider: ${(exam as any).provider}, level: ${exam.level}, studentState: ${studentState || 'not set'}`);
      throw new BadRequestException({
        code: 'NO_QUESTIONS_AVAILABLE',
        message: 'No questions available for this exam',
        examId: examIdStr,
        examTitle: exam.title,
        provider: (exam as any).provider,
        level: exam.level,
        studentState: studentState || null,
      });
    }

    this.logger.log(`Successfully generated ${picked.length} questions for attempt - examId: ${examIdStr}, userId: ${userId}`);

    // بناء items مع خلط الخيارات إذا كان السؤال MCQ
    const items: any[] = [];
    for (const p of picked) {
      items.push(await this.buildSnapshotItem(p.question, p.points, rng));
    }

    let expiresAt: Date | undefined = undefined;
    if (typeof exam.timeLimitMin === 'number' && exam.timeLimitMin > 0) {
      expiresAt = new Date(Date.now() + exam.timeLimitMin * 60 * 1000);
    }

    const totalMaxScore = items.reduce((s, it) => s + (it.points || 0), 0);

    const attempt = await this.AttemptModel.create({
      examId, studentId,
      status: AttemptStatus.IN_PROGRESS,
      attemptCount,
      randomSeed: seedNum,
      items,
      expiresAt,
      totalMaxScore,
    });

    return {
      attemptId: attempt._id,
      examId: attempt.examId,
      status: attempt.status,
      attemptCount: attempt.attemptCount,
      expiresAt: attempt.expiresAt,
      items: attempt.items.map((it: any) => ({
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
    this.ensureStudent(user);

    const userId = user.userId || (user as any).sub || (user as any).id;
    const attempt = await this.AttemptModel.findById(attemptIdStr).exec();
    if (!attempt) throw new NotFoundException('Attempt not found');

    if (attempt.studentId.toString() !== userId) throw new ForbiddenException();
    if (attempt.status !== AttemptStatus.IN_PROGRESS) throw new ForbiddenException('Attempt is not in progress');

    if (attempt.expiresAt && attempt.expiresAt.getTime() < Date.now()) {
      throw new ForbiddenException('Time is over');
    }

    const idx = this.findItemIndex(attempt, payload);
    const it: any = attempt.items[idx];

    if (it.qType === 'mcq') {
      if (!Array.isArray(payload.studentAnswerIndexes)) {
        throw new BadRequestException('Provide studentAnswerIndexes for MCQ');
      }
      it.studentAnswerIndexes = payload.studentAnswerIndexes;
    } else if (it.qType === 'fill') {
      it.studentAnswerText = (payload.studentAnswerText || '').trim();
    } else if (it.qType === 'true_false') {
      if (typeof payload.studentAnswerBoolean !== 'boolean') {
        throw new BadRequestException('Provide studentAnswerBoolean for true_false');
      }
      it.studentAnswerBoolean = payload.studentAnswerBoolean;
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

      if (correct.size <= 1) {
        auto = ans.size === 1 && correct.has([...ans][0]) ? it.points : 0;
      } else {
        const intersect = [...ans].filter(a => correct.has(a)).length;
        const fraction = (correct.size === 0) ? 0 : intersect / correct.size;
        auto = Math.round(it.points * fraction * 1000) / 1000;
      }
    }

    if (it.qType === 'true_false') {
      if (typeof it.answerKeyBoolean === 'boolean' && typeof it.studentAnswerBoolean === 'boolean') {
        auto = it.answerKeyBoolean === it.studentAnswerBoolean ? it.points : 0;
      }
    }

    if (it.qType === 'fill') {
      const ans = normalizeAnswer(it.studentAnswerText || '');
      // دعم fillExact كـ string أو array
      const exactList = Array.isArray(it.fillExact)
        ? it.fillExact.map((e: string) => normalizeAnswer(e))
        : it.fillExact
        ? [normalizeAnswer(it.fillExact)]
        : [];
      
      const exactHit = exactList.length > 0 && exactList.includes(ans);
      const regexHit = Array.isArray(it.regexList)
        ? it.regexList.some((rx: string) => {
            try {
              const reg = new RegExp(rx, 'i');
              return reg.test(ans);
            } catch {
              return false;
            }
          })
        : false;

      auto = exactHit || regexHit ? it.points : 0;
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

  async submitAttempt(user: ReqUser, attemptIdStr: string) {
    this.ensureStudent(user);

    const userId = user.userId || (user as any).sub || (user as any).id;
    const attempt = await this.AttemptModel.findById(attemptIdStr).exec();
    if (!attempt) throw new NotFoundException('Attempt not found');

    if (attempt.studentId.toString() !== userId) throw new ForbiddenException();
    if (attempt.status !== AttemptStatus.IN_PROGRESS) throw new ForbiddenException('Already submitted');

    const now = Date.now();
    attempt.submittedAt = new Date(now);
    attempt.timeUsedSec = Math.max(0, Math.floor((now - attempt.startedAt.getTime()) / 1000));
    attempt.status = AttemptStatus.SUBMITTED;

    let totalAuto = 0;
    let totalMax = 0;
    for (const it of attempt.items as any[]) {
      totalAuto += this.scoreItem(it);
      totalMax  += it.points || 0;
    }

    attempt.totalAutoScore = Math.round(totalAuto * 1000) / 1000;
    attempt.totalMaxScore  = totalMax;
    attempt.finalScore     = attempt.totalAutoScore + (attempt.totalManualScore || 0);

    await attempt.save();

    return {
      attemptId: attempt._id,
      status: attempt.status,
      totalAutoScore: attempt.totalAutoScore,
      totalMaxScore: attempt.totalMaxScore,
      finalScore: attempt.finalScore,
    };
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

