import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { Attempt, AttemptDocument, AttemptStatus } from './schemas/attempt.schema';
import { Exam, ExamDocument, ExamStatus } from '../exams/schemas/exam.schema';
import { Question, QuestionDocument, QuestionStatus } from '../questions/schemas/question.schema';

type ReqUser = { userId: string; role: 'student'|'teacher'|'admin' };

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

@Injectable()
export class AttemptsService {
  private RANDOM_SECRET = process.env.RANDOM_SECRET || 'SECRET_RANDOM_SERVER';

  constructor(
    @InjectModel(Attempt.name) private readonly AttemptModel: Model<AttemptDocument>,
    @InjectModel(Exam.name) private readonly ExamModel: Model<ExamDocument>,
    @InjectModel(Question.name) private readonly QuestionModel: Model<QuestionDocument>,
  ) {}

  private async computeAttemptCount(studentId: Types.ObjectId, examId: Types.ObjectId) {
    const count = await this.AttemptModel.countDocuments({ studentId, examId }).exec();
    return count + 1;
  }

  private computeSeed(attemptCount: number, studentId: string, examId: string) {
    const base = `${attemptCount}+${studentId}+${examId}+${this.RANDOM_SECRET}`;
    const hash = crypto.createHash('sha256').update(base).digest('hex');
    const first8 = hash.slice(0, 8);
    return parseInt(first8, 16) >>> 0;
  }

  private pickRandom<T>(arr: T[], n: number, rng: () => number): T[] {
    if (n <= 0) return [];
    if (arr.length <= n) return [...arr];
    const picked: T[] = [];
    const used = new Set<number>();
    while (picked.length < n && used.size < arr.length) {
      const idx = Math.floor(rng() * arr.length);
      if (!used.has(idx)) {
        used.add(idx);
        picked.push(arr[idx]);
      }
    }
    return picked;
  }

  private shuffleInPlace<T>(arr: T[], rng: () => number) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  private ensureStudent(user: ReqUser) {
    if (!user || user.role !== 'student') throw new ForbiddenException('Only student can perform this action');
  }

  private async generateQuestionListForAttempt(exam: ExamDocument, rng: () => number) {
    const selected: Array<{ question: QuestionDocument; points: number }> = [];

    for (const sec of exam.sections) {
      const hasItems = Array.isArray((sec as any).items) && (sec as any).items.length > 0;
      const hasQuota = typeof (sec as any).quota === 'number' && (sec as any).quota > 0;

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

        // خلط ترتيب الأسئلة داخل القسم إذا كان randomize=true
        if ((sec as any).randomize && sectionItems.length > 1) {
          this.shuffleInPlace(sectionItems, rng);
        }

        selected.push(...sectionItems);
      } else if (hasQuota) {
        const filter: any = { status: QuestionStatus.PUBLISHED };
        if (exam.level) filter.level = exam.level;
        if (sec.name) filter.section = sec.name;

        const candidates = await this.QuestionModel.find(filter).lean(false).exec();
        let pickList: QuestionDocument[] = [];

        if ((sec as any).difficultyDistribution) {
          const dd = (sec as any).difficultyDistribution as any;
          const easy = candidates.filter(c => c.difficulty === 'easy');
          const med  = candidates.filter(c => c.difficulty === 'medium');
          const hard = candidates.filter(c => c.difficulty === 'hard');

          pickList = [
            ...this.pickRandom(easy, dd.easy || 0, rng),
            ...this.pickRandom(med,  dd.medium || 0, rng),
            ...this.pickRandom(hard, dd.hard || 0, rng),
          ];

          const deficit = (sec as any).quota - pickList.length;
          if (deficit > 0) {
            const left = candidates.filter((c: any) => !pickList.some((p: any) => p._id.equals(c._id)));
            pickList.push(...this.pickRandom(left, deficit, rng));
          }
        } else {
          pickList = this.pickRandom(candidates, (sec as any).quota, rng);
        }

        for (const q of pickList) {
          selected.push({ question: q, points: 1 });
        }
      }
    }

    if (exam.randomizeQuestions) this.shuffleInPlace(selected, rng);
    return selected;
  }

  private buildSnapshotItem(q: QuestionDocument, points: number, rng?: () => number) {
    const item: any = {
      questionId: q._id,
      qType: q.qType,
      points,
      promptSnapshot: q.prompt,
      autoScore: 0,
      manualScore: 0,
    };

    // حفظ explanation إذا موجود
    if ((q as any).explanation) {
      item.explanationSnapshot = (q as any).explanation;
    }

    if (q.qType === 'mcq') {
      const options = [...(q.options || [])];
      const originalCorrectIdxs: number[] = [];
      options.forEach((o, i) => { if (o.isCorrect) originalCorrectIdxs.push(i); });

      // خلط ترتيب الخيارات إذا كان rng متوفر
      if (rng) {
        const shuffled = [...options];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(rng() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
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

    return item;
  }

  async startAttempt(examIdStr: string, user: ReqUser) {
    this.ensureStudent(user);

    const userId = user.userId || (user as any).sub || (user as any).id;
    const studentId = new Types.ObjectId(userId);
    const examId = new Types.ObjectId(examIdStr);

    const exam = await this.ExamModel.findById(examId).lean(false).exec();
    if (!exam) throw new NotFoundException('Exam not found');

    if (exam.status !== ExamStatus.PUBLISHED) {
      throw new ForbiddenException('Exam is not published');
    }

    if (typeof exam.attemptLimit === 'number' && exam.attemptLimit > 0) {
      const current = await this.AttemptModel.countDocuments({ examId, studentId }).exec();
      if (current >= exam.attemptLimit) {
        throw new ForbiddenException('Attempt limit reached');
      }
    }

    const attemptCount = await this.computeAttemptCount(studentId, examId);
    const seedNum = this.computeSeed(attemptCount, String(studentId), String(examId));
    const rng = mulberry32(seedNum);

    const picked = await this.generateQuestionListForAttempt(exam, rng);
    if (!picked.length) throw new BadRequestException('No questions available for this exam');

    // بناء items مع خلط الخيارات إذا كان السؤال MCQ
    const items = picked.map(p => this.buildSnapshotItem(p.question, p.points, rng));

    let expiresAt: Date | undefined = undefined;
    if (typeof (exam as any).timeLimitMin === 'number' && (exam as any).timeLimitMin > 0) {
      expiresAt = new Date(Date.now() + (exam as any).timeLimitMin * 60 * 1000);
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
    } else {
      throw new BadRequestException(`Unsupported qType ${it.qType}`);
    }

    await attempt.save();
    return { ok: true };
  }

  private normalizeText(s: string) {
    return s.trim().toLowerCase().replace(/\s+/g, ' ');
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
      const ans = this.normalizeText(it.studentAnswerText || '');
      if (it.fillExact && this.normalizeText(it.fillExact) === ans) {
        auto = it.points;
      } else if (Array.isArray(it.regexList)) {
        const ok = it.regexList.some((rx: string) => {
          try {
            const reg = new RegExp(rx, 'i');
            return reg.test(ans);
          } catch { return false; }
        });
        auto = ok ? it.points : 0;
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

  async gradeAttempt(user: ReqUser, attemptIdStr: string, items: { questionId: string; score: number; feedback?: string }[]) {
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
    const feedbackMap = new Map(
      items
        .filter(i => i.feedback !== undefined)
        .map(i => [i.questionId, i.feedback] as [string, string])
    );
    
    for (const it of attempt.items as any[]) {
      if (scoreMap.has(String(it.questionId))) {
        it.manualScore = scoreMap.get(String(it.questionId)) || 0;
      }
      if (feedbackMap.has(String(it.questionId))) {
        it.feedback = feedbackMap.get(String(it.questionId));
      }
    }

    attempt.totalManualScore = (attempt.items as any[]).reduce((s, it) => s + (it.manualScore || 0), 0);
    attempt.finalScore = attempt.totalAutoScore + attempt.totalManualScore;
    attempt.status = AttemptStatus.GRADED;

    await attempt.save();

    return { attemptId: attempt._id, finalScore: attempt.finalScore, status: attempt.status };
  }

  private buildViewForUser(attempt: AttemptDocument, exam: any, user: ReqUser) {
    const policy = (exam && (exam as any).resultsPolicy) || 'only_scores';

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
          autoScore: it.autoScore,
          manualScore: it.manualScore,
          feedback: it.feedback,
          explanation: it.explanationSnapshot,
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
          correctOptionIndexes: it.correctOptionIndexes,
          answerKeyBoolean: it.answerKeyBoolean,
          autoScore: it.autoScore,
          manualScore: it.manualScore,
          feedback: it.feedback,
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
          correctOptionIndexes: it.correctOptionIndexes,
          answerKeyBoolean: it.answerKeyBoolean,
          autoScore: it.autoScore,
          manualScore: it.manualScore,
          feedback: it.feedback,
          explanation: it.explanationSnapshot,
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
}

