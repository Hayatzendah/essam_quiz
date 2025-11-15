import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Attempt, AttemptDocument, AttemptStatus } from '../attempts/schemas/attempt.schema';
import { Exam, ExamDocument } from '../exams/schemas/exam.schema';
import { Question, QuestionDocument } from '../questions/schemas/question.schema';

type ReqUser = { userId: string; role: 'student' | 'teacher' | 'admin' };

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Attempt.name) private readonly AttemptModel: Model<AttemptDocument>,
    @InjectModel(Exam.name) private readonly ExamModel: Model<ExamDocument>,
    @InjectModel(Question.name) private readonly QuestionModel: Model<QuestionDocument>,
  ) {}

  private ensureTeacherOrAdmin(user: ReqUser) {
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      throw new ForbiddenException('Only teachers and admins can access analytics');
    }
  }

  async getOverview(user: ReqUser) {
    this.ensureTeacherOrAdmin(user);

    const userId = user.userId || (user as any).sub || (user as any).id;
    const isAdmin = user.role === 'admin';

    // إحصائيات عامة
    const totalExams = await this.ExamModel.countDocuments(
      isAdmin ? {} : { ownerId: userId },
    ).exec();

    const totalAttempts = await this.AttemptModel.countDocuments().exec();

    const totalQuestions = await this.QuestionModel.countDocuments({
      status: 'published',
    }).exec();

    // متوسط الدرجات
    const gradedAttempts = await this.AttemptModel.find({
      status: AttemptStatus.GRADED,
    })
      .select('finalScore totalMaxScore')
      .lean()
      .exec();

    const avgScore =
      gradedAttempts.length > 0
        ? gradedAttempts.reduce((sum, a) => sum + (a.finalScore || 0), 0) / gradedAttempts.length
        : 0;

    const avgPercentage =
      gradedAttempts.length > 0
        ? gradedAttempts.reduce(
            (sum, a) =>
              sum + (a.totalMaxScore > 0 ? (a.finalScore || 0) / a.totalMaxScore : 0),
            0,
          ) / gradedAttempts.length
        : 0;

    return {
      totalExams,
      totalAttempts,
      totalQuestions,
      averageScore: Math.round(avgScore * 100) / 100,
      averagePercentage: Math.round(avgPercentage * 10000) / 100, // كنسبة مئوية
      totalGradedAttempts: gradedAttempts.length,
    };
  }

  async getExamAnalytics(examId: string, user: ReqUser) {
    this.ensureTeacherOrAdmin(user);

    const userId = user.userId || (user as any).sub || (user as any).id;
    const isAdmin = user.role === 'admin';

    const exam = await this.ExamModel.findById(examId).lean().exec();
    if (!exam) throw new NotFoundException('Exam not found');

    if (!isAdmin && String(exam.ownerId) !== userId) {
      throw new ForbiddenException('You can only view analytics for your own exams');
    }

    // جميع محاولات هذا الامتحان
    const attempts = await this.AttemptModel.find({ examId })
      .select('finalScore totalMaxScore totalAutoScore totalManualScore status items')
      .lean()
      .exec();

    if (attempts.length === 0) {
      return {
        examId,
        examTitle: exam.title,
        totalAttempts: 0,
        message: 'No attempts found for this exam',
      };
    }

    // إحصائيات الدرجات
    const gradedAttempts = attempts.filter((a) => a.status === AttemptStatus.GRADED);
    const scores = gradedAttempts.map((a) => a.finalScore || 0);
    const percentages = gradedAttempts.map(
      (a) => (a.totalMaxScore > 0 ? (a.finalScore || 0) / a.totalMaxScore : 0) * 100,
    );

    const avgScore = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
    const avgPercentage =
      percentages.length > 0 ? percentages.reduce((s, v) => s + v, 0) / percentages.length : 0;

    // حساب الانحراف المعياري
    const variance =
      scores.length > 0
        ? scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length
        : 0;
    const stdDev = Math.sqrt(variance);

    // نسبة النجاح (افترضنا 60% كحد أدنى)
    const passingRate =
      percentages.length > 0
        ? (percentages.filter((p) => p >= 60).length / percentages.length) * 100
        : 0;

    // أصعب الأسئلة (نسبة الخطأ)
    const questionStats = new Map<string, { correct: number; total: number; errors: number }>();

    attempts.forEach((attempt) => {
      (attempt.items as any[]).forEach((item: any) => {
        const qId = String(item.questionId);
        if (!questionStats.has(qId)) {
          questionStats.set(qId, { correct: 0, total: 0, errors: 0 });
        }
        const stat = questionStats.get(qId)!;
        stat.total++;
        if (item.autoScore >= item.points) {
          stat.correct++;
        } else {
          stat.errors++;
        }
      });
    });

    const hardestQuestions = Array.from(questionStats.entries())
      .map(([questionId, stats]) => ({
        questionId,
        errorRate: stats.total > 0 ? (stats.errors / stats.total) * 100 : 0,
        correctRate: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
        totalAttempts: stats.total,
      }))
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 10); // أعلى 10 أسئلة صعوبة

    return {
      examId,
      examTitle: exam.title,
      totalAttempts: attempts.length,
      gradedAttempts: gradedAttempts.length,
      averageScore: Math.round(avgScore * 100) / 100,
      averagePercentage: Math.round(avgPercentage * 100) / 100,
      standardDeviation: Math.round(stdDev * 100) / 100,
      passingRate: Math.round(passingRate * 100) / 100,
      minScore: scores.length > 0 ? Math.min(...scores) : 0,
      maxScore: scores.length > 0 ? Math.max(...scores) : 0,
      hardestQuestions,
    };
  }

  async getQuestionAnalytics(questionId: string, user: ReqUser) {
    this.ensureTeacherOrAdmin(user);

    const question = await this.QuestionModel.findById(questionId).lean().exec();
    if (!question) throw new NotFoundException('Question not found');

    // البحث عن جميع المحاولات التي تحتوي على هذا السؤال
    const attempts = await this.AttemptModel.find({
      'items.questionId': questionId,
      status: AttemptStatus.GRADED,
    })
      .select('items')
      .lean()
      .exec();

    let totalAttempts = 0;
    let correctAttempts = 0;
    let totalScore = 0;
    let maxScore = 0;

    attempts.forEach((attempt) => {
      (attempt.items as any[]).forEach((item: any) => {
        if (String(item.questionId) === questionId) {
          totalAttempts++;
          maxScore = item.points || 0;
          totalScore += item.autoScore || 0;
          if ((item.autoScore || 0) >= (item.points || 0)) {
            correctAttempts++;
          }
        }
      });
    });

    const accuracyRate = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0;
    const averageScore = totalAttempts > 0 ? totalScore / totalAttempts : 0;

    return {
      questionId,
      questionPrompt: question.prompt,
      totalAttempts,
      correctAttempts,
      accuracyRate: Math.round(accuracyRate * 100) / 100,
      averageScore: Math.round(averageScore * 100) / 100,
      maxScore,
    };
  }
}


