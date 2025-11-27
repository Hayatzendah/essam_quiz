import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Inject,
  forwardRef,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Attempt, AttemptDocument, AttemptStatus, AttemptItem } from './schemas/attempt.schema';
import { Exam, ExamDocument } from '../exams/schemas/exam.schema';
import { Question, QuestionDocument, QuestionType, QuestionStatus } from '../questions/schemas/question.schema';
import { ExamsService } from '../exams/exams.service';
import { MediaService } from '../modules/media/media.service';
import { CreatePracticeExamDto } from '../exams/dto/create-exam.dto';
import { normalizeAnswer } from '../common/utils/normalize.util';
import * as crypto from 'crypto';

type ReqUser = { userId: string; role: 'student' | 'teacher' | 'admin' };

@Injectable()
export class AttemptsService {
  private readonly logger = new Logger(AttemptsService.name);

  constructor(
    @InjectModel(Attempt.name) private readonly attemptModel: Model<AttemptDocument>,
    @InjectModel(Exam.name) private readonly examModel: Model<ExamDocument>,
    @InjectModel(Question.name) private readonly questionModel: Model<QuestionDocument>,
    @Inject(forwardRef(() => ExamsService))
    private readonly examsService: ExamsService,
    private readonly mediaService: MediaService,
  ) {}

  /**
   * قائمة محاولات الطالب
   */
  async findByStudent(user: ReqUser, examId?: string) {
    const query: any = { studentId: new Types.ObjectId(user.userId) };
    if (examId) {
      query.examId = new Types.ObjectId(examId);
    }

    const attempts = await this.attemptModel
      .find(query)
      .sort({ createdAt: -1 })
      .populate('examId', 'title level')
      .lean()
      .exec();

    return attempts.map((a: any) => ({
      attemptId: String(a._id),
      examId: String(a.examId._id || a.examId),
      examTitle: a.examId?.title,
      status: a.status,
      attemptCount: a.attemptCount,
      startedAt: a.startedAt,
      submittedAt: a.submittedAt,
      finalScore: a.finalScore,
      totalMaxScore: a.totalMaxScore,
    }));
  }

  /**
   * بدء محاولة تمرين (إنشاء Exam وبدء Attempt في خطوة واحدة)
   */
  async startPracticeAttempt(dto: CreatePracticeExamDto, user: ReqUser) {
    // 1. إنشاء Exam
    const exam = await this.examsService.createPracticeExam(dto, user);
    const examId = exam.id;

    // 2. بدء Attempt على هذا Exam
    return this.startAttempt(examId, user);
  }

  /**
   * بدء محاولة على exam موجود
   */
  async startAttempt(examId: string, user: ReqUser) {
    // 1. التحقق من Exam
    const exam = await this.examModel.findById(examId).lean().exec();
    if (!exam) {
      throw new NotFoundException(`Exam with id "${examId}" not found`);
    }

    if (exam.status !== 'published') {
      throw new ForbiddenException('Exam is not published');
    }

    // 2. التحقق من attemptLimit
    const existingAttempts = await this.attemptModel
      .countDocuments({
        examId: new Types.ObjectId(examId),
        studentId: new Types.ObjectId(user.userId),
      })
      .exec();

    if (exam.attemptLimit && exam.attemptLimit > 0 && existingAttempts >= exam.attemptLimit) {
      throw new ForbiddenException('Attempt limit reached');
    }

    const attemptCount = existingAttempts + 1;

    // 3. اختيار الأسئلة
    const items = await this.selectQuestions(exam, attemptCount);

    if (items.length === 0) {
      throw new BadRequestException('No questions available for this exam');
    }

    // 4. إنشاء random seed
    const seedString = `${examId}-${user.userId}-${attemptCount}`;
    const randomSeed = this.generateSeed(seedString);

    // 5. ترتيب عشوائي إذا كان مطلوباً
    if (exam.randomizeQuestions) {
      this.shuffleArray(items, randomSeed);
    }

    // 6. إنشاء snapshots للأسئلة
    const itemsWithSnapshots = await Promise.all(
      items.map((item) => this.createItemSnapshot(item)),
    );

    // 7. حساب expiresAt
    const expiresAt = exam.timeLimitMin
      ? new Date(Date.now() + exam.timeLimitMin * 60 * 1000)
      : undefined;

    // 8. إنشاء Attempt
    const attempt = await this.attemptModel.create({
      examId: new Types.ObjectId(examId),
      studentId: new Types.ObjectId(user.userId),
      status: AttemptStatus.IN_PROGRESS,
      attemptCount,
      randomSeed,
      startedAt: new Date(),
      expiresAt,
      items: itemsWithSnapshots,
      totalMaxScore: itemsWithSnapshots.reduce((sum, item) => sum + item.points, 0),
    });

    // 9. إرجاع البيانات (بدون answer keys)
    const attemptObj = attempt.toObject();
    const responseItems = attemptObj.items.map((item: any) => {
      const { answerKeyBoolean, fillExact, regexList, correctOptionIndexes, answerKeyMatch, answerKeyReorder, ...rest } = item;
      return rest;
    });

    return {
      attemptId: String(attempt._id),
      examId: String(attempt.examId),
      status: attempt.status,
      attemptCount: attempt.attemptCount,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      timeLimitMin: exam.timeLimitMin,
      items: responseItems,
      totalMaxScore: attempt.totalMaxScore,
    };
  }

  /**
   * اختيار الأسئلة من Exam
   */
  private async selectQuestions(exam: any, attemptCount: number): Promise<AttemptItem[]> {
    const items: AttemptItem[] = [];

    for (const section of exam.sections || []) {
      if (section.items && section.items.length > 0) {
        // أسئلة ثابتة
        for (const sectionItem of section.items) {
          items.push({
            questionId: new Types.ObjectId(sectionItem.questionId),
            qType: '', // سيتم ملؤه من السؤال
            points: sectionItem.points || 1,
          } as AttemptItem);
        }
      } else if (section.quota && section.quota > 0) {
        // اختيار عشوائي حسب quota
        const selectedQuestions = await this.selectRandomQuestions(
          section,
          exam.level,
          exam.provider,
          attemptCount,
        );
        for (const q of selectedQuestions) {
          items.push({
            questionId: q._id,
            qType: q.qType,
            points: 1,
          } as AttemptItem);
        }
      }
    }

    // جلب بيانات الأسئلة
    const questionIds = items.map((item) => item.questionId);
    const questions = await this.questionModel
      .find({ _id: { $in: questionIds }, status: QuestionStatus.PUBLISHED })
      .lean()
      .exec();

    const questionMap = new Map(questions.map((q: any) => [String(q._id), q]));

    // تحديث qType
    for (const item of items) {
      const question = questionMap.get(String(item.questionId));
      if (question) {
        item.qType = question.qType;
      }
    }

    return items.filter((item) => item.qType); // إزالة الأسئلة غير الموجودة
  }

  /**
   * اختيار أسئلة عشوائية حسب quota
   */
  private async selectRandomQuestions(
    section: any,
    level?: string,
    provider?: string,
    attemptCount: number = 1,
  ): Promise<any[]> {
    const quota = section.quota || 0;
    if (quota === 0) return [];

    // بناء query
    const query: any = { status: QuestionStatus.PUBLISHED };

    if (level) query.level = level;
    if (provider) query.provider = provider;
    if (section.tags && section.tags.length > 0) {
      query.tags = { $in: section.tags };
    }

    // تطبيق توزيع الصعوبة
    if (section.difficultyDistribution) {
      const dist = section.difficultyDistribution;
      const difficulties: string[] = [];
      if (dist.easy) difficulties.push('easy');
      if (dist.medium) difficulties.push('medium');
      if (dist.hard) difficulties.push('hard');
      if (difficulties.length > 0) {
        query.difficulty = { $in: difficulties };
      }
    }

    // جلب جميع الأسئلة المتاحة
    const allQuestions = await this.questionModel.find(query).lean().exec();

    if (allQuestions.length === 0) return [];

    // تطبيق توزيع الصعوبة
    let selected: any[] = [];
    if (section.difficultyDistribution) {
      const dist = section.difficultyDistribution;
      const easy = allQuestions.filter((q: any) => q.difficulty === 'easy');
      const medium = allQuestions.filter((q: any) => q.difficulty === 'medium');
      const hard = allQuestions.filter((q: any) => q.difficulty === 'hard');

      const seedString = `section-${section.name}-${attemptCount}`;
      const seed = this.generateSeed(seedString);

      if (dist.easy) {
        selected.push(...this.selectRandom(easy, dist.easy, seed));
      }
      if (dist.medium) {
        selected.push(...this.selectRandom(medium, dist.medium, seed + 1));
      }
      if (dist.hard) {
        selected.push(...this.selectRandom(hard, dist.hard, seed + 2));
      }
    } else {
      // اختيار عشوائي بسيط
      const seedString = `section-${section.name}-${attemptCount}`;
      const seed = this.generateSeed(seedString);
      selected = this.selectRandom(allQuestions, quota, seed);
    }

    return selected;
  }

  /**
   * اختيار عشوائي مع seed
   */
  private selectRandom<T>(array: T[], count: number, seed: number): T[] {
    if (count >= array.length) return [...array];

    // استخدام seed للعشوائية الحتمية
    const shuffled = [...array];
    let currentSeed = seed;

    // Fisher-Yates shuffle مع seed
    for (let i = shuffled.length - 1; i > 0; i--) {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      const j = Math.floor((currentSeed / 233280) * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, count);
  }

  /**
   * توليد seed من string
   */
  private generateSeed(input: string): number {
    const hash = crypto.createHash('sha256').update(input).digest('hex');
    return parseInt(hash.substring(0, 8), 16) % 1000000;
  }

  /**
   * خلط array مع seed
   */
  private shuffleArray<T>(array: T[], seed: number): void {
    let currentSeed = seed;
    for (let i = array.length - 1; i > 0; i--) {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      const j = Math.floor((currentSeed / 233280) * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * إنشاء snapshot للسؤال
   */
  private async createItemSnapshot(item: AttemptItem): Promise<AttemptItem> {
    const question = await this.questionModel.findById(item.questionId).lean().exec();
    if (!question) {
      throw new NotFoundException(`Question ${item.questionId} not found`);
    }

    const snapshot: any = {
      questionId: item.questionId,
      qType: question.qType,
      points: item.points,
      promptSnapshot: question.prompt,
    };

    // حفظ answer keys
    if (question.qType === QuestionType.TRUE_FALSE) {
      snapshot.answerKeyBoolean = question.answerKeyBoolean;
    } else if (question.qType === QuestionType.FILL) {
      snapshot.fillExact = question.fillExact;
      snapshot.regexList = question.regexList;
    } else if (question.qType === QuestionType.MCQ) {
      snapshot.correctOptionIndexes = (question.options || [])
        .map((opt: any, idx: number) => (opt.isCorrect ? idx : -1))
        .filter((idx: number) => idx >= 0);
    } else if (question.qType === QuestionType.MATCH) {
      snapshot.answerKeyMatch = question.answerKeyMatch;
    } else if (question.qType === QuestionType.REORDER) {
      snapshot.answerKeyReorder = question.answerKeyReorder;
    }

    // حفظ options snapshot (مع ترتيب عشوائي محتمل)
    if (question.options && question.options.length > 0) {
      const options = [...question.options];
      // يمكن إضافة ترتيب عشوائي هنا إذا كان مطلوباً
      snapshot.optionsText = options.map((opt: any) => opt.text);
      snapshot.optionOrder = options.map((_: any, idx: number) => idx);
    }

    // حفظ media snapshot
    if (question.media) {
      snapshot.mediaType = question.media.type;
      snapshot.mediaMime = question.media.mime;
      try {
        snapshot.mediaUrl = await this.mediaService.getPresignedUrl(question.media.key, 3600);
      } catch (error) {
        this.logger.warn(`Failed to get presigned URL for ${question.media.key}: ${error}`);
      }
    }

    return snapshot as AttemptItem;
  }

  /**
   * حفظ إجابة
   */
  async saveAnswer(
    user: ReqUser,
    attemptId: string,
    answerData: {
      itemIndex?: number;
      questionId?: string;
      studentAnswerIndexes?: number[];
      studentAnswerText?: string;
      studentAnswerBoolean?: boolean;
      studentAnswerMatch?: [string, string][];
      studentAnswerReorder?: string[];
      studentAnswerAudioKey?: string;
    },
  ) {
    const attempt = await this.attemptModel.findById(attemptId).exec();
    if (!attempt) {
      throw new NotFoundException(`Attempt ${attemptId} not found`);
    }

    // التحقق من الصلاحيات
    if (attempt.studentId.toString() !== user.userId) {
      throw new ForbiddenException('You can only modify your own attempts');
    }

    // التحقق من الحالة
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new ForbiddenException('Attempt is not in progress');
    }

    // التحقق من الوقت
    if (attempt.expiresAt && new Date() > attempt.expiresAt) {
      throw new ForbiddenException('Attempt time has expired');
    }

    // إيجاد item
    let item: any;
    if (answerData.itemIndex !== undefined) {
      item = attempt.items[answerData.itemIndex];
      if (!item) {
        throw new BadRequestException(`Item at index ${answerData.itemIndex} not found`);
      }
    } else if (answerData.questionId) {
      item = attempt.items.find(
        (i: any) => i.questionId.toString() === answerData.questionId,
      );
      if (!item) {
        throw new BadRequestException(`Question ${answerData.questionId} not found in attempt`);
      }
    } else {
      throw new BadRequestException('Either itemIndex or questionId must be provided');
    }

    // حفظ الإجابة
    if (answerData.studentAnswerIndexes !== undefined) {
      item.studentAnswerIndexes = answerData.studentAnswerIndexes;
    }
    if (answerData.studentAnswerText !== undefined) {
      item.studentAnswerText = answerData.studentAnswerText;
    }
    if (answerData.studentAnswerBoolean !== undefined) {
      item.studentAnswerBoolean = answerData.studentAnswerBoolean;
    }
    if (answerData.studentAnswerMatch !== undefined) {
      item.studentAnswerMatch = answerData.studentAnswerMatch;
    }
    if (answerData.studentAnswerReorder !== undefined) {
      item.studentAnswerReorder = answerData.studentAnswerReorder;
    }
    if (answerData.studentAnswerAudioKey !== undefined) {
      item.studentAnswerAudioKey = answerData.studentAnswerAudioKey;
      // يمكن إضافة logic لإنشاء presigned URL هنا
    }

    await attempt.save();

    return { ok: true };
  }

  /**
   * تسليم المحاولة
   */
  async submitAttempt(user: ReqUser, attemptId: string, answers?: any[]) {
    const attempt = await this.attemptModel.findById(attemptId).exec();
    if (!attempt) {
      throw new NotFoundException(`Attempt ${attemptId} not found`);
    }

    // التحقق من الصلاحيات
    if (attempt.studentId.toString() !== user.userId) {
      throw new ForbiddenException('You can only submit your own attempts');
    }

    // التحقق من الحالة
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new ForbiddenException('Attempt is already submitted');
    }

    // حفظ الإجابات إذا تم إرسالها
    if (answers && Array.isArray(answers)) {
      for (const answer of answers) {
        const itemIndex = answer.itemIndex;
        if (itemIndex !== undefined && attempt.items[itemIndex]) {
          const item = attempt.items[itemIndex];
          if (answer.userAnswer !== undefined) {
            // تحويل userAnswer حسب نوع السؤال
            if (Array.isArray(answer.userAnswer)) {
              item.studentAnswerIndexes = answer.userAnswer;
            } else if (typeof answer.userAnswer === 'string') {
              item.studentAnswerText = answer.userAnswer;
            } else if (typeof answer.userAnswer === 'boolean') {
              item.studentAnswerBoolean = answer.userAnswer;
            }
          }
        }
      }
    }

    // التصحيح الآلي
    this.autoGrade(attempt);

    // تحديث الحالة
    attempt.status = AttemptStatus.SUBMITTED;
    attempt.submittedAt = new Date();
    attempt.finalScore = attempt.totalAutoScore + attempt.totalManualScore;

    await attempt.save();

    return attempt.toObject();
  }

  /**
   * التصحيح الآلي
   */
  private autoGrade(attempt: AttemptDocument) {
    let totalAutoScore = 0;

    for (const item of attempt.items) {
      let score = 0;

      if (item.qType === QuestionType.MCQ) {
        score = this.gradeMcq(item);
      } else if (item.qType === QuestionType.TRUE_FALSE) {
        score = this.gradeTrueFalse(item);
      } else if (item.qType === QuestionType.FILL) {
        score = this.gradeFill(item);
      } else if (item.qType === QuestionType.MATCH) {
        score = this.gradeMatch(item);
      } else if (item.qType === QuestionType.REORDER) {
        score = this.gradeReorder(item);
      }

      item.autoScore = score;
      totalAutoScore += score;
    }

    attempt.totalAutoScore = totalAutoScore;
  }

  /**
   * تصحيح MCQ
   */
  private gradeMcq(item: any): number {
    if (!item.correctOptionIndexes || !item.studentAnswerIndexes) return 0;

    const correct = new Set(item.correctOptionIndexes);
    const student = new Set(item.studentAnswerIndexes);

    // حساب النسبة
    const intersect = [...student].filter((idx) => correct.has(idx)).length;
    const fraction = intersect / correct.size;

    return Math.round(item.points * fraction * 1000) / 1000;
  }

  /**
   * تصحيح True/False
   */
  private gradeTrueFalse(item: any): number {
    if (item.answerKeyBoolean === undefined || item.studentAnswerBoolean === undefined) {
      return 0;
    }
    return item.answerKeyBoolean === item.studentAnswerBoolean ? item.points : 0;
  }

  /**
   * تصحيح Fill
   */
  private gradeFill(item: any): number {
    if (!item.studentAnswerText) return 0;

    const normalizedStudent = normalizeAnswer(item.studentAnswerText);
    const normalizedExact = item.fillExact ? normalizeAnswer(item.fillExact) : '';

    // التحقق من fillExact
    if (normalizedExact && normalizedStudent === normalizedExact) {
      return item.points;
    }

    // التحقق من regexList
    if (item.regexList && Array.isArray(item.regexList)) {
      for (const regexStr of item.regexList) {
        try {
          const regex = new RegExp(regexStr, 'i');
          if (regex.test(normalizedStudent)) {
            return item.points;
          }
        } catch (error) {
          this.logger.warn(`Invalid regex: ${regexStr}`);
        }
      }
    }

    return 0;
  }

  /**
   * تصحيح Match
   */
  private gradeMatch(item: any): number {
    if (!item.answerKeyMatch || !item.studentAnswerMatch) return 0;

    const correct = new Set(
      item.answerKeyMatch.map((pair: [string, string]) => `${pair[0]}|${pair[1]}`),
    );
    const student = new Set(
      item.studentAnswerMatch.map((pair: [string, string]) => `${pair[0]}|${pair[1]}`),
    );

    const intersect = [...student].filter((pair) => correct.has(pair)).length;
    const fraction = intersect / correct.size;

    return Math.round(item.points * fraction * 1000) / 1000;
  }

  /**
   * تصحيح Reorder
   */
  private gradeReorder(item: any): number {
    if (!item.answerKeyReorder || !item.studentAnswerReorder) return 0;

    if (item.answerKeyReorder.length !== item.studentAnswerReorder.length) return 0;

    const correct = item.answerKeyReorder.map((s: string) => normalizeAnswer(s));
    const student = item.studentAnswerReorder.map((s: string) => normalizeAnswer(s));

    const matches = correct.filter((val: string, idx: number) => val === student[idx]).length;
    const fraction = matches / correct.length;

    return Math.round(item.points * fraction * 1000) / 1000;
  }

  /**
   * التصحيح اليدوي
   */
  async gradeAttempt(user: ReqUser, attemptId: string, items: Array<{ questionId: string; score: number }>) {
    const attempt = await this.attemptModel.findById(attemptId).populate('examId').exec();
    if (!attempt) {
      throw new NotFoundException(`Attempt ${attemptId} not found`);
    }

    const exam = attempt.examId as any;

    // التحقق من الصلاحيات
    if (user.role === 'student') {
      throw new ForbiddenException('Students cannot grade attempts');
    }

    if (user.role === 'teacher' && exam.ownerId?.toString() !== user.userId) {
      throw new ForbiddenException('You can only grade attempts for your own exams');
    }

    // التحقق من الحالة
    if (attempt.status === AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Attempt must be submitted before grading');
    }

    // تطبيق الدرجات اليدوية
    let totalManualScore = 0;
    for (const gradeItem of items) {
      const attemptItem = attempt.items.find(
        (item: any) => item.questionId.toString() === gradeItem.questionId,
      );
      if (attemptItem) {
        attemptItem.manualScore = Math.max(0, Math.min(gradeItem.score, attemptItem.points));
        totalManualScore += attemptItem.manualScore;
      }
    }

    attempt.totalManualScore = totalManualScore;
    attempt.finalScore = attempt.totalAutoScore + attempt.totalManualScore;
    attempt.status = AttemptStatus.GRADED;

    await attempt.save();

    return attempt.toObject();
  }

  /**
   * عرض المحاولة
   */
  async getAttempt(user: ReqUser, attemptId: string) {
    const attempt = await this.attemptModel.findById(attemptId).populate('examId').lean().exec();
    if (!attempt) {
      throw new NotFoundException(`Attempt ${attemptId} not found`);
    }

    const exam = attempt.examId as any;

    // التحقق من الصلاحيات
    const isOwner = attempt.studentId.toString() === user.userId;
    const isExamOwner = exam.ownerId?.toString() === user.userId;
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isExamOwner && !isAdmin) {
      throw new ForbiddenException('You do not have permission to view this attempt');
    }

    // تطبيق resultsPolicy
    const policy = exam.resultsPolicy || 'explanations_with_scores';
    const isStudent = user.role === 'student' && isOwner;

    const result: any = {
      attemptId: String(attempt._id),
      examId: String(attempt.examId),
      status: attempt.status,
      attemptCount: attempt.attemptCount,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      finalScore: attempt.finalScore,
      totalMaxScore: attempt.totalMaxScore,
      totalAutoScore: attempt.totalAutoScore,
      totalManualScore: attempt.totalManualScore,
    };

    // إضافة items حسب policy
    if (policy === 'only_scores' && isStudent) {
      // لا items للطالب
    } else if (policy === 'correct_with_scores' && isStudent) {
      // items مع scores فقط
      result.items = attempt.items.map((item: any) => ({
        questionId: item.questionId,
        qType: item.qType,
        promptSnapshot: item.promptSnapshot,
        optionsText: item.optionsText,
        points: item.points,
        autoScore: item.autoScore,
        manualScore: item.manualScore,
        isCorrect: (item.autoScore || 0) + (item.manualScore || 0) >= item.points,
      }));
    } else {
      // explanations_with_scores أو للمعلم/الأدمن
      result.items = attempt.items.map((item: any) => {
        const itemResult: any = {
          questionId: item.questionId,
          qType: item.qType,
          promptSnapshot: item.promptSnapshot,
          optionsText: item.optionsText,
          points: item.points,
          autoScore: item.autoScore,
          manualScore: item.manualScore,
        };

        // إضافة answer keys للمعلم/الأدمن أو إذا كان policy يسمح
        if (!isStudent || policy === 'explanations_with_scores') {
          if (item.qType === QuestionType.MCQ) {
            itemResult.correctOptionIndexes = item.correctOptionIndexes;
          } else if (item.qType === QuestionType.TRUE_FALSE) {
            itemResult.answerKeyBoolean = item.answerKeyBoolean;
          } else if (item.qType === QuestionType.FILL) {
            itemResult.fillExact = item.fillExact;
          }
        }

        // إضافة إجابات الطالب
        if (item.studentAnswerIndexes) itemResult.studentAnswerIndexes = item.studentAnswerIndexes;
        if (item.studentAnswerText) itemResult.studentAnswerText = item.studentAnswerText;
        if (item.studentAnswerBoolean !== undefined)
          itemResult.studentAnswerBoolean = item.studentAnswerBoolean;
        if (item.studentAnswerMatch) itemResult.studentAnswerMatch = item.studentAnswerMatch;
        if (item.studentAnswerReorder) itemResult.studentAnswerReorder = item.studentAnswerReorder;

        // إضافة media
        if (item.mediaUrl) {
          itemResult.mediaType = item.mediaType;
          itemResult.mediaUrl = item.mediaUrl;
          itemResult.mediaMime = item.mediaMime;
        }

        return itemResult;
      });
    }

    return result;
  }
}
