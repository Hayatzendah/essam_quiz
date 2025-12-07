import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Attempt, AttemptDocument, AttemptStatus } from '../attempts/schemas/attempt.schema';
import { Exam, ExamDocument } from '../exams/schemas/exam.schema';
import { Question, QuestionDocument, QuestionStatus } from '../questions/schemas/question.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

type ReqUser = { userId: string; role: 'student' | 'teacher' | 'admin' };

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Attempt.name) private readonly AttemptModel: Model<AttemptDocument>,
    @InjectModel(Exam.name) private readonly ExamModel: Model<ExamDocument>,
    @InjectModel(Question.name) private readonly QuestionModel: Model<QuestionDocument>,
    @InjectModel(User.name) private readonly UserModel: Model<UserDocument>,
  ) {}

  private ensureTeacherOrAdmin(user: ReqUser) {
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      throw new ForbiddenException('Only teachers and admins can access analytics');
    }
  }

  async getOverview(user: ReqUser) {
    this.ensureTeacherOrAdmin(user);

    // Count students (users with role = 'student')
    const totalStudents = await this.UserModel.countDocuments({ role: 'student' }).exec();

    // Exams
    const draftExamsCount = await this.ExamModel.countDocuments({ status: 'draft' }).exec();
    const publishedExamsCount = await this.ExamModel.countDocuments({ status: 'published' }).exec();

    // Questions (all questions, not filtered by status)
    const totalQuestions = await this.QuestionModel.countDocuments({}).exec();

    // Average score over all finished attempts (SUBMITTED or GRADED)
    const avgScoreResult = await this.AttemptModel.aggregate([
      {
        $match: {
          status: { $in: [AttemptStatus.SUBMITTED, AttemptStatus.GRADED] },
          totalMaxScore: { $gt: 0 }, // Only attempts with valid max score
        },
      },
      {
        $project: {
          scorePercentage: {
            $cond: [
              { $gt: ['$totalMaxScore', 0] },
              {
                $multiply: [
                  {
                    $divide: ['$finalScore', '$totalMaxScore'],
                  },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgScore: { $avg: '$scorePercentage' },
        },
      },
    ]).exec();

    const averageScore = avgScoreResult.length > 0 && avgScoreResult[0].avgScore
      ? Math.round(avgScoreResult[0].avgScore * 100) / 100
      : 0;

    return {
      totalStudents,
      draftExamsCount,
      publishedExamsCount,
      totalQuestions,
      averageScore,
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
   * @returns قائمة بالنشاط اليومي [{ date: "2025-12-01", activeStudents: 5, attemptsCount: 8, avgScore: 72 }, ...]
   */
  async getActivity(days: number = 7, user?: ReqUser) {
    if (user) {
      this.ensureTeacherOrAdmin(user);
    }

    // حساب التاريخ من عدد الأيام الماضية
    // نستخدم UTC لتجنب مشاكل timezone
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    since.setUTCHours(0, 0, 0, 0); // بداية اليوم في UTC

    // تجميع المحاولات حسب التاريخ مع حساب activeStudents و avgScore
    // نستخدم SUBMITTED و GRADED (المحاولات المكتملة)
    const attempts = await this.AttemptModel.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
          status: { $in: [AttemptStatus.SUBMITTED, AttemptStatus.GRADED] }, // المحاولات المكتملة
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
          attemptsCount: { $sum: 1 },
          activeStudents: { $addToSet: '$studentId' }, // عدد الطلاب الفريدين
          totalScore: {
            $sum: {
              $cond: [
                { $gt: ['$totalMaxScore', 0] },
                {
                  $multiply: [
                    {
                      $divide: ['$finalScore', '$totalMaxScore'],
                    },
                    100, // تحويل إلى نسبة مئوية
                  ],
                },
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          attemptsCount: 1,
          activeStudents: { $size: '$activeStudents' }, // عدد الطلاب الفريدين
          avgScore: {
            $cond: [
              { $gt: ['$attemptsCount', 0] },
              { $divide: ['$totalScore', '$attemptsCount'] },
              0,
            ],
          },
        },
      },
      {
        $sort: { date: 1 }, // ترتيب حسب التاريخ
      },
    ]).exec();

    // تقريب avgScore
    return attempts.map((item) => ({
      date: item.date,
      activeStudents: item.activeStudents,
      attemptsCount: item.attemptsCount,
      avgScore: Math.round(item.avgScore * 100) / 100,
    }));
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
    // نستخدم UTC لتجنب مشاكل timezone
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    since.setUTCHours(0, 0, 0, 0); // بداية اليوم في UTC

    // تجميع المحاولات حسب examId وحساب عدد المحاولات وعدد الناجحين
    // نستخدم SUBMITTED و GRADED (المحاولات المكتملة)
    const attempts = await this.AttemptModel.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
          status: { $in: [AttemptStatus.SUBMITTED, AttemptStatus.GRADED] }, // المحاولات المكتملة
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
        totalPassed: 0,
        totalFailed: 0,
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
    const totalFailed = totalAttempts - totalPassed;
    const overallPassRate = totalAttempts
      ? Math.round((totalPassed / totalAttempts) * 100)
      : 0;

    return {
      overallPassRate,
      totalPassed,
      totalFailed,
      exams: perExam,
    };
  }

  /**
   * الحصول على أفضل أو أسوأ الامتحانات حسب متوسط الدرجات
   * @param type نوع الترتيب: 'best' (أعلى متوسط) أو 'worst' (أدنى متوسط)
   * @param user المستخدم الحالي
   * @returns قائمة بالامتحانات مع متوسط الدرجات وعدد المحاولات
   */
  async getExamPerformance(type: 'best' | 'worst' = 'best', user?: ReqUser) {
    if (user) {
      this.ensureTeacherOrAdmin(user);
    }

    // تجميع المحاولات حسب examId وحساب متوسط الدرجات
    // نستخدم SUBMITTED و GRADED (المحاولات المكتملة)
    const examStats = await this.AttemptModel.aggregate([
      {
        $match: {
          status: { $in: [AttemptStatus.SUBMITTED, AttemptStatus.GRADED] }, // المحاولات المكتملة
        },
      },
      {
        $group: {
          _id: '$examId',
          avgScore: {
            $avg: {
              $cond: [
                { $gt: ['$totalMaxScore', 0] },
                {
                  $multiply: [
                    {
                      $divide: ['$finalScore', '$totalMaxScore'],
                    },
                    100, // تحويل إلى نسبة مئوية
                  ],
                },
                0,
              ],
            },
          },
          attempts: { $sum: 1 },
        },
      },
      {
        $match: {
          attempts: { $gt: 0 }, // فقط الامتحانات التي لديها محاولات
        },
      },
      {
        $sort: type === 'best' ? { avgScore: -1 } : { avgScore: 1 }, // ترتيب حسب النوع
      },
      {
        $limit: 5, // أعلى/أدنى 5 امتحانات
      },
    ]).exec();

    if (examStats.length === 0) {
      return [];
    }

    // جلب معلومات الامتحانات
    const examIds = examStats.map((stat) => stat._id);
    const exams = await this.ExamModel.find({ _id: { $in: examIds } })
      .select({ title: 1 })
      .lean()
      .exec();

    const examsMap = new Map(exams.map((e) => [String(e._id), e.title]));

    // بناء النتيجة
    const result = examStats.map((stat) => ({
      examId: String(stat._id),
      examName: examsMap.get(String(stat._id)) ?? 'Unknown exam',
      avgScore: Math.round(stat.avgScore * 100) / 100,
      attempts: stat.attempts,
    }));

    return result;
  }

  /**
   * الحصول على أداء الطلاب حسب المهارة
   * @param user المستخدم الحالي
   * @returns إحصائيات لكل مهارة (hoeren, lesen, schreiben, sprechen, misc)
   */
  async getSkills(user?: ReqUser) {
    if (user) {
      this.ensureTeacherOrAdmin(user);
    }

    // جلب جميع المحاولات المكتملة مع ربطها بالأسئلة
    // نستخدم SUBMITTED و GRADED (المحاولات المكتملة)
    const attemptsBySkill = await this.AttemptModel.aggregate([
      {
        $match: {
          status: { $in: [AttemptStatus.SUBMITTED, AttemptStatus.GRADED] }, // المحاولات المكتملة
        },
      },
      {
        $unwind: '$items', // تفكيك items
      },
      {
        $lookup: {
          from: 'questions',
          localField: 'items.questionId',
          foreignField: '_id',
          as: 'question',
        },
      },
      {
        $unwind: {
          path: '$question',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $match: {
          'question.mainSkill': { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$question.mainSkill',
          totalScore: {
            $sum: {
              $cond: [
                { $gt: ['$items.points', 0] },
                {
                  $multiply: [
                    {
                      $divide: [
                        { $add: ['$items.autoScore', '$items.manualScore'] },
                        '$items.points',
                      ],
                    },
                    100, // تحويل إلى نسبة مئوية
                  ],
                },
                0,
              ],
            },
          },
          attemptsCount: { $sum: 1 },
        },
      },
    ]).exec();

    // خريطة لتسميات المهارات
    const skillLabels: Record<string, string> = {
      hoeren: 'Hören',
      lesen: 'Lesen',
      schreiben: 'Schreiben',
      sprechen: 'Sprechen',
      misc: 'Misc',
      mixed: 'Mixed',
      leben_test: 'Leben Test',
    };

    // جلب عدد الأسئلة لكل مهارة
    const questionsBySkill = await this.QuestionModel.aggregate([
      {
        $match: {
          mainSkill: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$mainSkill',
          questionsCount: { $sum: 1 },
        },
      },
    ]).exec();

    // دمج البيانات
    const skillMap = new Map<string, { questionsCount: number; avgScore: number }>();
    
    // إضافة عدد الأسئلة
    questionsBySkill.forEach((item) => {
      const skill = String(item._id).toLowerCase();
      skillMap.set(skill, {
        questionsCount: item.questionsCount,
        avgScore: 0,
      });
    });

    // إضافة متوسط الدرجات
    attemptsBySkill.forEach((stat) => {
      const skill = String(stat._id).toLowerCase();
      const avgScore = stat.attemptsCount > 0 ? stat.totalScore / stat.attemptsCount : 0;
      
      if (skillMap.has(skill)) {
        skillMap.get(skill)!.avgScore = avgScore;
      } else {
        skillMap.set(skill, {
          questionsCount: 0,
          avgScore: avgScore,
        });
      }
    });

    // بناء النتيجة
    const items = Array.from(skillMap.entries()).map(([skill, data]) => ({
      skill,
      questionsCount: data.questionsCount,
      avgScore: Math.round(data.avgScore * 100) / 100,
    }));

    // ترتيب حسب المهارات الأساسية أولاً
    const skillOrder = ['hoeren', 'lesen', 'schreiben', 'sprechen', 'misc', 'mixed', 'leben_test'];
    items.sort((a, b) => {
      const aIndex = skillOrder.indexOf(a.skill);
      const bIndex = skillOrder.indexOf(b.skill);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    // إرجاع النتيجة بالشكل المتوقع من الفرونت
    return { items };
  }

  /**
   * الحصول على إحصائيات الأسئلة (الأسئلة التي تحتاج تطوير والأكثر خطأ)
   * @param user المستخدم الحالي
   * @returns إحصائيات الأسئلة (questionsToImprove, mostWrongQuestions)
   */
  async getQuestions(user?: ReqUser) {
    if (user) {
      this.ensureTeacherOrAdmin(user);
    }

    // تجميع إجابات الطلاب من attempts لكل سؤال
    const questionStats = await this.AttemptModel.aggregate([
      {
        $match: {
          status: { $in: [AttemptStatus.SUBMITTED, AttemptStatus.GRADED] }, // المحاولات المكتملة
        },
      },
      {
        $unwind: '$items', // تفكيك items
      },
      {
        $group: {
          _id: '$items.questionId',
          totalAttempts: { $sum: 1 },
          correctAttempts: {
            $sum: {
              $cond: [
                {
                  $gte: [
                    { $add: ['$items.autoScore', '$items.manualScore'] },
                    '$items.points',
                  ],
                },
                1,
                0,
              ],
            },
          },
          wrongAttempts: {
            $sum: {
              $cond: [
                {
                  $lt: [
                    { $add: ['$items.autoScore', '$items.manualScore'] },
                    '$items.points',
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $match: {
          totalAttempts: { $gte: 1 }, // على الأقل محاولة واحدة
        },
      },
      {
        $project: {
          _id: 0,
          questionId: '$_id',
          totalAttempts: 1,
          correctAttempts: 1,
          wrongAttempts: 1,
          successRate: {
            $multiply: [
              {
                $divide: ['$correctAttempts', '$totalAttempts'],
              },
              100,
            ],
          },
        },
      },
    ]).exec();

    if (questionStats.length === 0) {
      return {
        questionsToImprove: [],
        mostWrongQuestions: [],
      };
    }

    // جلب معلومات الأسئلة
    const questionIds = questionStats.map((stat) => stat.questionId);
    const questions = await this.QuestionModel.find({ _id: { $in: questionIds } })
      .select({ prompt: 1 })
      .lean()
      .exec();

    const questionsMap = new Map(
      questions.map((q) => [String(q._id), q.prompt]),
    );

    // بناء قائمة الأسئلة التي تحتاج تطوير (successRate < 40%)
    const questionsToImprove = questionStats
      .filter((stat) => stat.successRate < 40)
      .map((stat) => ({
        questionId: String(stat.questionId),
        prompt: questionsMap.get(String(stat.questionId)) ?? 'Unknown question',
        successRate: Math.round(stat.successRate * 100) / 100,
      }))
      .sort((a, b) => a.successRate - b.successRate); // ترتيب حسب نسبة النجاح (تصاعدي)

    // بناء قائمة أكثر الأسئلة خطأ (Top 10 حسب wrongAttempts)
    const mostWrongQuestions = questionStats
      .map((stat) => ({
        questionId: String(stat.questionId),
        prompt: questionsMap.get(String(stat.questionId)) ?? 'Unknown question',
        wrongAttempts: stat.wrongAttempts,
        successRate: Math.round(stat.successRate * 100) / 100,
      }))
      .sort((a, b) => b.wrongAttempts - a.wrongAttempts) // ترتيب حسب عدد الأخطاء (تنازلي)
      .slice(0, 10); // أعلى 10 أسئلة

    return {
      questionsToImprove,
      mostWrongQuestions,
    };
  }

  /**
   * الحصول على الأسئلة الأكثر خطأ
   * @param user المستخدم الحالي
   * @returns قائمة بالأسئلة الأكثر خطأ (أعلى عدد إجابات خاطئة)
   */
  async getMostIncorrectQuestions(user?: ReqUser) {
    if (user) {
      this.ensureTeacherOrAdmin(user);
    }

    // تجميع إجابات الطلاب من attempts
    const questionStats = await this.AttemptModel.aggregate([
      {
        $match: {
          status: { $in: [AttemptStatus.SUBMITTED, AttemptStatus.GRADED] }, // المحاولات المكتملة
        },
      },
      {
        $unwind: '$items', // تفكيك items
      },
      {
        $group: {
          _id: '$items.questionId',
          totalAnswers: { $sum: 1 },
          wrongAnswers: {
            $sum: {
              $cond: [
                {
                  $lt: [
                    { $add: ['$items.autoScore', '$items.manualScore'] },
                    '$items.points',
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $match: {
          totalAnswers: { $gte: 1 }, // على الأقل إجابة واحدة
        },
      },
      {
        $project: {
          _id: 0,
          questionId: '$_id',
          totalAnswers: 1,
          wrongAnswers: 1,
          successRate: {
            $multiply: [
              {
                $divide: [
                  { $subtract: ['$totalAnswers', '$wrongAnswers'] },
                  '$totalAnswers',
                ],
              },
              100,
            ],
          },
        },
      },
      {
        $sort: { wrongAnswers: -1, successRate: 1 }, // ترتيب حسب عدد الأخطاء (تنازلي) ثم نسبة النجاح (تصاعدي)
      },
      {
        $limit: 10, // أعلى 10 أسئلة
      },
    ]).exec();

    if (questionStats.length === 0) {
      return [];
    }

    // جلب معلومات الأسئلة
    const questionIds = questionStats.map((stat) => stat.questionId);
    const questions = await this.QuestionModel.find({ _id: { $in: questionIds } })
      .select({ prompt: 1 })
      .lean()
      .exec();

    const questionsMap = new Map(questions.map((q) => [String(q._id), q.prompt]));

    // بناء النتيجة
    return questionStats.map((stat) => ({
      questionId: String(stat.questionId),
      questionPrompt: questionsMap.get(String(stat.questionId)) ?? 'Unknown question',
      totalAnswers: stat.totalAnswers,
      wrongAnswers: stat.wrongAnswers,
      successRate: Math.round(stat.successRate * 100) / 100,
    }));
  }

  /**
   * الحصول على الأسئلة التي تحتاج تطوير (نسبة النجاح أقل من 40%)
   * @param user المستخدم الحالي
   * @returns قائمة بالأسئلة التي تحتاج تطوير
   */
  async getQuestionsNeedingImprovement(user?: ReqUser) {
    if (user) {
      this.ensureTeacherOrAdmin(user);
    }

    // تجميع إجابات الطلاب من attempts
    const questionStats = await this.AttemptModel.aggregate([
      {
        $match: {
          status: { $in: [AttemptStatus.SUBMITTED, AttemptStatus.GRADED] }, // المحاولات المكتملة
        },
      },
      {
        $unwind: '$items', // تفكيك items
      },
      {
        $group: {
          _id: '$items.questionId',
          totalAnswers: { $sum: 1 },
          wrongAnswers: {
            $sum: {
              $cond: [
                {
                  $lt: [
                    { $add: ['$items.autoScore', '$items.manualScore'] },
                    '$items.points',
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $match: {
          totalAnswers: { $gte: 1 }, // على الأقل إجابة واحدة
        },
      },
      {
        $project: {
          _id: 0,
          questionId: '$_id',
          totalAnswers: 1,
          wrongAnswers: 1,
          successRate: {
            $multiply: [
              {
                $divide: [
                  { $subtract: ['$totalAnswers', '$wrongAnswers'] },
                  '$totalAnswers',
                ],
              },
              100,
            ],
          },
        },
      },
      {
        $match: {
          successRate: { $lt: 40 }, // نسبة النجاح أقل من 40%
        },
      },
      {
        $sort: { successRate: 1, wrongAnswers: -1 }, // ترتيب حسب نسبة النجاح (تصاعدي) ثم عدد الأخطاء (تنازلي)
      },
    ]).exec();

    if (questionStats.length === 0) {
      return [];
    }

    // جلب معلومات الأسئلة
    const questionIds = questionStats.map((stat) => stat.questionId);
    const questions = await this.QuestionModel.find({ _id: { $in: questionIds } })
      .select({ prompt: 1 })
      .lean()
      .exec();

    const questionsMap = new Map(questions.map((q) => [String(q._id), q.prompt]));

    // بناء النتيجة
    return questionStats.map((stat) => ({
      questionId: String(stat.questionId),
      questionPrompt: questionsMap.get(String(stat.questionId)) ?? 'Unknown question',
      totalAnswers: stat.totalAnswers,
      wrongAnswers: stat.wrongAnswers,
      successRate: Math.round(stat.successRate * 100) / 100,
    }));
  }

  /**
   * الحصول على إحصائيات المهارات (Skills Analytics)
   * تجميع حسب mainSkill من الأسئلة
   * @returns قائمة بإحصائيات كل مهارة
   */
  async getSkillsAnalytics(user?: ReqUser) {
    if (user) {
      this.ensureTeacherOrAdmin(user);
    }

    // جلب جميع المحاولات المكتملة
    const attempts = await this.AttemptModel.find({
      status: { $in: [AttemptStatus.SUBMITTED, AttemptStatus.GRADED] },
    })
      .select({ items: 1 })
      .lean()
      .exec();

    if (!attempts.length) {
      return [];
    }

    // تجميع questionIds من جميع المحاولات
    const questionIds = new Set<string>();
    attempts.forEach((attempt) => {
      attempt.items?.forEach((item: any) => {
        if (item.questionId) {
          questionIds.add(String(item.questionId));
        }
      });
    });

    // جلب معلومات الأسئلة مع mainSkill
    const questions = await this.QuestionModel.find({
      _id: { $in: Array.from(questionIds) },
      mainSkill: { $exists: true, $ne: null },
    })
      .select({ _id: 1, mainSkill: 1 })
      .lean()
      .exec();

    // خريطة لربط questionId بـ skill
    const questionSkillMap = new Map<string, string>();
    questions.forEach((q) => {
      questionSkillMap.set(String(q._id), String(q.mainSkill).toLowerCase());
    });

    // تجميع الإحصائيات حسب المهارة
    const skillsMap: Record<
      string,
      {
        skill: string;
        totalQuestions: number;
        correct: number;
        wrong: number;
        successRate: number;
      }
    > = {};

    for (const attempt of attempts) {
      for (const item of attempt.items || []) {
        const questionId = String(item.questionId);
        const skill = questionSkillMap.get(questionId);

        if (!skill) continue;

        if (!skillsMap[skill]) {
          skillsMap[skill] = {
            skill,
            totalQuestions: 0,
            correct: 0,
            wrong: 0,
            successRate: 0,
          };
        }

        skillsMap[skill].totalQuestions++;

        // حساب isCorrect: autoScore + manualScore >= points
        const totalScore = (item.autoScore || 0) + (item.manualScore || 0);
        const points = item.points || 0;
        const isCorrect = totalScore >= points;

        if (isCorrect) {
          skillsMap[skill].correct++;
        } else {
          skillsMap[skill].wrong++;
        }
      }
    }

    // حساب نسب النجاح
    const result = Object.values(skillsMap).map((skill) => ({
      ...skill,
      successRate: skill.totalQuestions
        ? Math.round((skill.correct / skill.totalQuestions) * 100)
        : 0,
    }));

    // ترتيب حسب المهارات الأساسية
    const skillOrder = ['hoeren', 'lesen', 'schreiben', 'sprechen', 'misc', 'mixed', 'leben_test'];
    result.sort((a, b) => {
      const aIndex = skillOrder.indexOf(a.skill);
      const bIndex = skillOrder.indexOf(b.skill);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    return result;
  }

  /**
   * الحصول على المهارات التي تحتاج تحسين (نسبة النجاح < 40%)
   * @param user المستخدم الحالي
   * @returns قائمة بالمهارات التي تحتاج تحسين
   */
  async getSkillsNeedImprovement(user?: ReqUser) {
    if (user) {
      this.ensureTeacherOrAdmin(user);
    }

    const skills = await this.getSkillsAnalytics(user);
    return skills.filter((s) => s.successRate < 40);
  }

  /**
   * الحصول على الأسئلة الأكثر خطأ
   * @param user المستخدم الحالي
   * @returns قائمة بالأسئلة الأكثر خطأ (أعلى عدد إجابات خاطئة)
   */
  async getMostWrongQuestions(user?: ReqUser) {
    if (user) {
      this.ensureTeacherOrAdmin(user);
    }

    // جلب جميع المحاولات المكتملة
    const attempts = await this.AttemptModel.find({
      status: { $in: [AttemptStatus.SUBMITTED, AttemptStatus.GRADED] },
    })
      .select({ items: 1 })
      .lean()
      .exec();

    const wrongMap: Record<string, number> = {};

    for (const attempt of attempts) {
      for (const item of attempt.items || []) {
        const questionId = String(item.questionId);

        // حساب isCorrect: autoScore + manualScore >= points
        const totalScore = (item.autoScore || 0) + (item.manualScore || 0);
        const points = item.points || 0;
        const isCorrect = totalScore >= points;

        if (!isCorrect) {
          wrongMap[questionId] = (wrongMap[questionId] || 0) + 1;
        }
      }
    }

    // تحويل إلى array وترتيب
    const result = Object.entries(wrongMap)
      .map(([questionId, count]) => ({ questionId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // أعلى 10 أسئلة

    // جلب معلومات الأسئلة
    if (result.length > 0) {
      const questionIds = result.map((r) => r.questionId);
      const questions = await this.QuestionModel.find({
        _id: { $in: questionIds },
      })
        .select({ prompt: 1 })
        .lean()
        .exec();

      const questionsMap = new Map(
        questions.map((q) => [String(q._id), q.prompt]),
      );

      return result.map((r) => ({
        questionId: r.questionId,
        questionPrompt: questionsMap.get(r.questionId) ?? 'Unknown question',
        count: r.count,
      }));
    }

    return result;
  }
}





