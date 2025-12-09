import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Attempt, AttemptDocument, AttemptStatus } from '../attempts/schemas/attempt.schema';
import { Exam, ExamDocument } from '../exams/schemas/exam.schema';
import { QueryStudentsDto } from './dto/query-students.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Attempt.name) private readonly attemptModel: Model<AttemptDocument>,
    @InjectModel(Exam.name) private readonly examModel: Model<ExamDocument>,
  ) {}

  async getStudents(query: QueryStudentsDto) {
    const { search, level, status, activity, page = 1, limit = 10 } = query;

    // بناء الفلتر الأساسي - فقط الطلاب
    const filter: any = {
      role: 'student',
    };

    // فلتر البحث (اسم أو إيميل)
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // ملاحظة: level و status غير موجودين في User schema حالياً
    // يمكن إضافتهم لاحقاً أو تجاهلهم الآن
    // if (level) {
    //   filter.level = level;
    // }
    // if (status) {
    //   filter.status = status;
    // }

    // حساب skip للـ pagination
    const skip = (page - 1) * limit;

    // جلب الطلاب
    const students = await this.userModel
      .find(filter)
      .select('-password -refreshTokenHash') // استبعاد كلمة السر
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    // جلب إحصائيات المحاولات لكل طالب
    const studentIds = students.map((s: any) => new Types.ObjectId(s._id));

    // حساب attemptsCount و lastActivity لكل طالب
    const attemptsStats = await this.attemptModel
      .aggregate([
        {
          $match: {
            studentId: { $in: studentIds },
            status: { $in: [AttemptStatus.SUBMITTED, AttemptStatus.GRADED] }, // فقط المحاولات المكتملة
          },
        },
        {
          $project: {
            studentId: 1,
            activityDate: {
              $cond: [
                { $ifNull: ['$submittedAt', false] },
                '$submittedAt',
                '$createdAt', // إذا لم يكن هناك submittedAt، استخدم createdAt
              ],
            },
          },
        },
        {
          $group: {
            _id: '$studentId',
            attemptsCount: { $sum: 1 },
            lastActivity: { $max: '$activityDate' },
          },
        },
      ])
      .exec();

    // إنشاء map للوصول السريع
    const statsMap = new Map(
      attemptsStats.map((stat: any) => [
        stat._id.toString(),
        {
          attemptsCount: stat.attemptsCount,
          lastActivity: stat.lastActivity,
        },
      ]),
    );

    // دمج البيانات
    const items = students.map((student: any) => {
      const stats = statsMap.get(student._id.toString()) || {
        attemptsCount: 0,
        lastActivity: null,
      };

      // فلتر activity (hasAttempts / noAttempts)
      if (activity === 'hasAttempts' && stats.attemptsCount === 0) {
        return null;
      }
      if (activity === 'noAttempts' && stats.attemptsCount > 0) {
        return null;
      }

      return {
        id: student._id.toString(),
        name: student.name || 'غير محدد',
        email: student.email,
        level: student.level || null, // إذا كان موجوداً في المستقبل
        status: student.status || 'active', // افتراضي active
        lastActivity: stats.lastActivity,
        attemptsCount: stats.attemptsCount,
      };
    }).filter((item) => item !== null); // إزالة null items من activity filter

    // حساب العدد الإجمالي (قبل activity filter)
    const total = await this.userModel.countDocuments(filter).exec();

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async getStudentById(studentId: string) {
    // التحقق من صحة الـ ID
    if (!Types.ObjectId.isValid(studentId)) {
      throw new NotFoundException('Student not found');
    }

    // البحث عن الطالب
    const student = await this.userModel
      .findOne({
        _id: new Types.ObjectId(studentId),
        role: 'student', // التأكد أنه طالب
      })
      .select('-password -refreshTokenHash') // استبعاد كلمة السر
      .lean()
      .exec();

    if (!student) {
      return null;
    }

    // جلب إحصائيات المحاولات
    const attemptsStats = await this.attemptModel
      .aggregate([
        {
          $match: {
            studentId: new Types.ObjectId(studentId),
            status: { $in: [AttemptStatus.SUBMITTED, AttemptStatus.GRADED] },
          },
        },
        {
          $project: {
            studentId: 1,
            activityDate: {
              $cond: [
                { $ifNull: ['$submittedAt', false] },
                '$submittedAt',
                '$createdAt',
              ],
            },
          },
        },
        {
          $group: {
            _id: '$studentId',
            attemptsCount: { $sum: 1 },
            lastActivity: { $max: '$activityDate' },
          },
        },
      ])
      .exec();

    const stats = attemptsStats.length > 0
      ? {
          attemptsCount: attemptsStats[0].attemptsCount,
          lastActivity: attemptsStats[0].lastActivity,
        }
      : {
          attemptsCount: 0,
          lastActivity: null,
        };

    // إرجاع نفس الشكل المستخدم في getStudents
    const studentObj = student as any;
    return {
      id: student._id.toString(),
      name: student.name || 'غير محدد',
      email: student.email,
      level: studentObj.level || null,
      status: studentObj.status || 'active',
      lastActivity: stats.lastActivity,
      attemptsCount: stats.attemptsCount,
      // إضافة تفاصيل إضافية إذا لزم الأمر
      createdAt: studentObj.createdAt || null,
      updatedAt: studentObj.updatedAt || null,
      state: student.state || null,
    };
  }

  async getStudentPerformance(studentId: string) {
    // التحقق من صحة الـ ID
    if (!Types.ObjectId.isValid(studentId)) {
      throw new NotFoundException('Student not found');
    }

    const studentObjectId = new Types.ObjectId(studentId);

    // جلب جميع محاولات الطالب المكتملة
    const attempts = await this.attemptModel
      .find({
        studentId: studentObjectId,
        status: { $in: [AttemptStatus.SUBMITTED, AttemptStatus.GRADED] },
      })
      .populate('examId', 'title level examCategory mainSkill')
      .sort({ submittedAt: -1, createdAt: -1 })
      .lean()
      .exec();

    if (attempts.length === 0) {
      return {
        totalAttempts: 0,
        completedAttempts: 0,
        averageScore: 0,
        averagePercentage: 0,
        bestScore: 0,
        worstScore: 0,
        passingRate: 0,
        totalPassed: 0,
        totalFailed: 0,
        recentAttempts: [],
        performanceBySkill: [],
        performanceByLevel: [],
        performanceByExam: [],
        exams: [], // للتوافق
      };
    }

    // حساب الإحصائيات الأساسية
    const scores = attempts.map((a: any) => a.finalScore || 0);
    const percentages = attempts.map((a: any) => {
      if (a.totalMaxScore > 0) {
        return ((a.finalScore || 0) / a.totalMaxScore) * 100;
      }
      return 0;
    });

    const avgScore = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
    const avgPercentage =
      percentages.length > 0 ? percentages.reduce((s, v) => s + v, 0) / percentages.length : 0;

    const bestScore = Math.max(...scores);
    const worstScore = Math.min(...scores);

    // نسبة النجاح (افترضنا 60% كحد أدنى)
    const passingThreshold = 60;
    const passed = percentages.filter((p) => p >= passingThreshold).length;
    const failed = percentages.length - passed;
    const passingRate = percentages.length > 0 ? (passed / percentages.length) * 100 : 0;

    // آخر 10 محاولات
    const recentAttempts = attempts.slice(0, 10).map((attempt: any) => ({
      attemptId: attempt._id.toString(),
      examId: attempt.examId?._id?.toString() || null,
      examTitle: attempt.examId?.title || 'Unknown Exam',
      score: attempt.finalScore || 0,
      maxScore: attempt.totalMaxScore || 0,
      percentage: attempt.totalMaxScore > 0
        ? Math.round(((attempt.finalScore || 0) / attempt.totalMaxScore) * 100)
        : 0,
      status: attempt.status,
      submittedAt: attempt.submittedAt || attempt.createdAt,
      passed: attempt.totalMaxScore > 0
        ? ((attempt.finalScore || 0) / attempt.totalMaxScore) * 100 >= passingThreshold
        : false,
    }));

    // الأداء حسب المهارة
    const skillMap = new Map<string, { total: number; totalScore: number; totalMaxScore: number }>();
    attempts.forEach((attempt: any) => {
      const skill = attempt.examId?.mainSkill || 'unknown';
      if (!skillMap.has(skill)) {
        skillMap.set(skill, { total: 0, totalScore: 0, totalMaxScore: 0 });
      }
      const stat = skillMap.get(skill)!;
      stat.total++;
      stat.totalScore += attempt.finalScore || 0;
      stat.totalMaxScore += attempt.totalMaxScore || 0;
    });

    const performanceBySkill = Array.from(skillMap.entries()).map(([skill, stat]) => ({
      skill,
      attemptsCount: stat.total,
      averageScore: stat.total > 0 ? Math.round((stat.totalScore / stat.total) * 100) / 100 : 0,
      averagePercentage:
        stat.totalMaxScore > 0
          ? Math.round(((stat.totalScore / stat.totalMaxScore) * 100) * 100) / 100
          : 0,
    }));

    // الأداء حسب المستوى
    const levelMap = new Map<string, { total: number; totalScore: number; totalMaxScore: number }>();
    attempts.forEach((attempt: any) => {
      const level = attempt.examId?.level || 'unknown';
      if (!levelMap.has(level)) {
        levelMap.set(level, { total: 0, totalScore: 0, totalMaxScore: 0 });
      }
      const stat = levelMap.get(level)!;
      stat.total++;
      stat.totalScore += attempt.finalScore || 0;
      stat.totalMaxScore += attempt.totalMaxScore || 0;
    });

    const performanceByLevel = Array.from(levelMap.entries()).map(([level, stat]) => ({
      level,
      attemptsCount: stat.total,
      averageScore: stat.total > 0 ? Math.round((stat.totalScore / stat.total) * 100) / 100 : 0,
      averagePercentage:
        stat.totalMaxScore > 0
          ? Math.round(((stat.totalScore / stat.totalMaxScore) * 100) * 100) / 100
          : 0,
    }));

    // الأداء حسب الامتحان (performanceByExam)
    const examMap = new Map<
      string,
      {
        examId: string;
        examTitle: string;
        attempts: any[];
        totalTime: number;
        lastSubmittedAt: Date | null;
      }
    >();

    attempts.forEach((attempt: any) => {
      const examId = attempt.examId?._id?.toString() || attempt.examId?.toString() || 'unknown';
      const examTitle = attempt.examId?.title || 'Unknown Exam';

      if (!examMap.has(examId)) {
        examMap.set(examId, {
          examId,
          examTitle,
          attempts: [],
          totalTime: 0,
          lastSubmittedAt: null,
        });
      }

      const examStat = examMap.get(examId)!;
      examStat.attempts.push(attempt);
      
      // حساب الوقت المستغرق
      if (attempt.timeUsedSec) {
        examStat.totalTime += attempt.timeUsedSec;
      } else if (attempt.startedAt && attempt.submittedAt) {
        const timeDiff = new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime();
        examStat.totalTime += Math.floor(timeDiff / 1000); // تحويل إلى ثواني
      }

      // آخر تاريخ إرسال
      const submittedAt = attempt.submittedAt || attempt.createdAt;
      if (submittedAt && (!examStat.lastSubmittedAt || new Date(submittedAt) > examStat.lastSubmittedAt)) {
        examStat.lastSubmittedAt = new Date(submittedAt);
      }
    });

    const performanceByExam = Array.from(examMap.entries()).map(([examId, stat]) => {
      // حساب أفضل درجة
      const scores = stat.attempts.map((a: any) => {
        // حساب finalScore من items إذا لم يكن موجوداً
        let finalScore = a.finalScore || 0;
        if (finalScore === 0 && a.items && Array.isArray(a.items)) {
          const totalAutoScore = a.items.reduce((sum: number, item: any) => sum + (item.autoScore || 0), 0);
          const totalManualScore = a.items.reduce((sum: number, item: any) => sum + (item.manualScore || 0), 0);
          finalScore = totalAutoScore + totalManualScore;
        }
        return finalScore;
      });

      // حساب maxScore (نأخذ أول محاولة لأنها عادة نفس الامتحان)
      let maxScore = stat.attempts[0]?.totalMaxScore || 0;
      if (maxScore === 0 && stat.attempts[0]?.items && Array.isArray(stat.attempts[0].items)) {
        maxScore = stat.attempts[0].items.reduce((sum: number, item: any) => sum + (item.points || 0), 0);
      }

      const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
      const hasCompleted = stat.attempts.some((a: any) => 
        a.status === AttemptStatus.GRADED || a.status === AttemptStatus.SUBMITTED
      );

      return {
        examId: stat.examId,
        examTitle: stat.examTitle,
        score: Math.round(bestScore * 100) / 100,
        maxScore: maxScore,
        status: hasCompleted ? 'completed' : 'in_progress',
        attempts: stat.attempts.length,
        totalTime: stat.totalTime,
        submittedAt: stat.lastSubmittedAt,
      };
    });

    // ترتيب حسب آخر تاريخ إرسال (الأحدث أولاً)
    performanceByExam.sort((a, b) => {
      if (!a.submittedAt && !b.submittedAt) return 0;
      if (!a.submittedAt) return 1;
      if (!b.submittedAt) return -1;
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });

    return {
      totalAttempts: attempts.length,
      completedAttempts: attempts.length,
      averageScore: Math.round(avgScore * 100) / 100,
      averagePercentage: Math.round(avgPercentage * 100) / 100,
      bestScore: Math.round(bestScore * 100) / 100,
      worstScore: Math.round(worstScore * 100) / 100,
      passingRate: Math.round(passingRate * 100) / 100,
      totalPassed: passed,
      totalFailed: failed,
      recentAttempts,
      performanceBySkill,
      performanceByLevel,
      performanceByExam,
      exams: performanceByExam, // للتوافق مع الفرونت
    };
  }

  async getStudentAttempts(studentId: string) {
    // التحقق من صحة الـ ID
    if (!Types.ObjectId.isValid(studentId)) {
      throw new NotFoundException('Student not found');
    }

    const studentObjectId = new Types.ObjectId(studentId);

    // جلب جميع محاولات الطالب مع تفاصيل الامتحان
    const attempts = await this.attemptModel
      .find({
        studentId: studentObjectId,
      })
      .populate('examId', 'title provider level examCategory')
      .sort({ submittedAt: -1, createdAt: -1 })
      .lean()
      .exec();

    // تحويل المحاولات إلى الشكل المطلوب مع حساب الدرجات بشكل صحيح
    return attempts.map((attempt: any) => {
      const exam = attempt.examId || {};
      
      // حساب totalMaxScore من items إذا لم يكن محسوباً
      let totalMaxScore = attempt.totalMaxScore || 0;
      if (totalMaxScore === 0 && attempt.items && Array.isArray(attempt.items)) {
        totalMaxScore = attempt.items.reduce((sum: number, item: any) => {
          return sum + (item.points || 0);
        }, 0);
      }

      // حساب finalScore من autoScore + manualScore لكل item
      let finalScore = attempt.finalScore || 0;
      if (finalScore === 0 && attempt.items && Array.isArray(attempt.items)) {
        const totalAutoScore = attempt.items.reduce((sum: number, item: any) => {
          return sum + (item.autoScore || 0);
        }, 0);
        const totalManualScore = attempt.items.reduce((sum: number, item: any) => {
          return sum + (item.manualScore || 0);
        }, 0);
        finalScore = totalAutoScore + totalManualScore;
      }

      // حساب النسبة المئوية
      const percentage = totalMaxScore > 0
        ? Math.round(((finalScore / totalMaxScore) * 100) * 100) / 100
        : 0;

      return {
        id: attempt._id.toString(),
        examId: exam._id ? exam._id.toString() : null,
        examTitle: exam.title || 'Unknown Exam',
        provider: exam.provider || null,
        score: finalScore,
        totalScore: finalScore, // للتوافق
        maxScore: totalMaxScore,
        totalMaxScore: totalMaxScore, // للتوافق
        percentage: percentage,
        status: attempt.status === AttemptStatus.GRADED
          ? 'completed'
          : attempt.status === AttemptStatus.SUBMITTED
          ? 'submitted'
          : 'in_progress',
        startedAt: attempt.startedAt || attempt.createdAt,
        submittedAt: attempt.submittedAt || null,
        // إضافة حقول إضافية للتوافق
        totalAutoScore: attempt.totalAutoScore || 0,
        totalManualScore: attempt.totalManualScore || 0,
      };
    });
  }

  async getStudentSkills(studentId: string) {
    // التحقق من صحة الـ ID
    if (!Types.ObjectId.isValid(studentId)) {
      throw new NotFoundException('Student not found');
    }

    const studentObjectId = new Types.ObjectId(studentId);

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

    // جلب جميع محاولات الطالب المكتملة مع تفاصيل الامتحان
    const attempts = await this.attemptModel
      .find({
        studentId: studentObjectId,
        status: { $in: [AttemptStatus.SUBMITTED, AttemptStatus.GRADED] },
      })
      .populate('examId', 'title level mainSkill')
      .lean()
      .exec();

    if (attempts.length === 0) {
      return [];
    }

    // تجميع البيانات حسب المهارة والمستوى
    const skillLevelMap = new Map<
      string,
      { attemptsCount: number; totalScore: number; totalMaxScore: number }
    >();

    attempts.forEach((attempt: any) => {
      const exam = attempt.examId || {};
      const skill = exam.mainSkill || 'unknown';
      const level = exam.level || 'unknown';
      const key = `${skill}_${level}`;

      if (!skillLevelMap.has(key)) {
        skillLevelMap.set(key, {
          attemptsCount: 0,
          totalScore: 0,
          totalMaxScore: 0,
        });
      }

      const stat = skillLevelMap.get(key)!;
      stat.attemptsCount++;
      stat.totalScore += attempt.finalScore || 0;
      stat.totalMaxScore += attempt.totalMaxScore || 0;
    });

    // بناء النتيجة
    const skills = Array.from(skillLevelMap.entries()).map(([key, stat]) => {
      const [skill, level] = key.split('_');
      const skillLabel = skillLabels[skill.toLowerCase()] || skill;
      const averageScore =
        stat.attemptsCount > 0 && stat.totalMaxScore > 0
          ? Math.round(((stat.totalScore / stat.totalMaxScore) * 100) * 100) / 100
          : 0;

      return {
        skill: skillLabel,
        level: level !== 'unknown' ? level : null,
        attemptsCount: stat.attemptsCount,
        averageScore: averageScore,
      };
    });

    // ترتيب حسب المهارات الأساسية أولاً
    const skillOrder = ['Hören', 'Lesen', 'Schreiben', 'Sprechen', 'Misc', 'Mixed', 'Leben Test'];
    skills.sort((a, b) => {
      const aIndex = skillOrder.indexOf(a.skill);
      const bIndex = skillOrder.indexOf(b.skill);
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.skill.localeCompare(b.skill);
    });

    return skills;
  }
}

