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
            (sum, a) => sum + (a.totalMaxScore > 0 ? (a.finalScore || 0) / a.totalMaxScore : 0),
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

  /**
   * الحصول على إحصائيات النشاط اليومي (عدد المحاولات لكل يوم)
   * @param days عدد الأيام الماضية (افتراضي: 7)
   * @param user المستخدم الحالي
   * @returns قائمة بالنشاط اليومي [{ date: "2025-12-01", count: 12 }, ...]
   */
  async getActivity(days: number = 7, user?: ReqUser) {
    if (user) {
      this.ensureTeacherOrAdmin(user);
    }

    // حساب التاريخ من عدد الأيام الماضية
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0); // بداية اليوم

    // تجميع المحاولات حسب التاريخ
    const attempts = await this.AttemptModel.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
              timezone: 'UTC',
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 }, // ترتيب حسب التاريخ
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          count: 1,
        },
      },
    ]).exec();

    return attempts;
  }

  /**
   * الحصول على إحصائيات معدل النجاح لكل امتحان
   * @param days عدد الأيام الماضية (افتراضي: 30)
   * @param user المستخدم الحالي
   * @returns معدل النجاح الإجمالي ومعدل النجاح لكل امتحان
   */
  async getPassRate(days: number = 30, user?: ReqUser) {
    if (user) {
      this.ensureTeacherOrAdmin(user);
    }

    // حساب التاريخ من عدد الأيام الماضية
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0); // بداية اليوم

    // تجميع المحاولات حسب examId وحساب عدد المحاولات وعدد الناجحين
    const attempts = await this.AttemptModel.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
          status: AttemptStatus.GRADED, // فقط المحاولات المصححة
        },
      },
      {
        $group: {
          _id: '$examId',
          attemptsCount: { $sum: 1 },
          passedCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ['$totalMaxScore', 0] },
                    {
                      $gte: [
                        {
                          $divide: ['$finalScore', '$totalMaxScore'],
                        },
                        0.6, // 60% كحد أدنى للنجاح
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]).exec();

    if (attempts.length === 0) {
      return {
        overallPassRate: 0,
        exams: [],
      };
    }

    // جلب معلومات الامتحانات
    const examIds = attempts.map((a) => a._id);
    const exams = await this.ExamModel.find({ _id: { $in: examIds } })
      .select({ title: 1 })
      .lean()
      .exec();

    const examsMap = new Map(exams.map((e) => [String(e._id), e.title]));

    // حساب معدل النجاح لكل امتحان
    const perExam = attempts.map((a) => {
      const passRate = a.attemptsCount
        ? (a.passedCount / a.attemptsCount) * 100
        : 0;

      return {
        examId: String(a._id),
        examName: examsMap.get(String(a._id)) ?? 'Unknown exam',
        attemptsCount: a.attemptsCount,
        passedCount: a.passedCount,
        passRate: Math.round(passRate * 100) / 100, // تقريب لرقمين عشريين
      };
    });

    // حساب معدل النجاح الإجمالي
    const totalAttempts = attempts.reduce((s, a) => s + a.attemptsCount, 0);
    const totalPassed = attempts.reduce((s, a) => s + a.passedCount, 0);
    const overallPassRate = totalAttempts
      ? Math.round((totalPassed / totalAttempts) * 100 * 100) / 100
      : 0;

    return {
      overallPassRate,
      exams: perExam,
    };
  }
}





