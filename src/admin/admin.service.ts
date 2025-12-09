import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Attempt, AttemptDocument, AttemptStatus } from '../attempts/schemas/attempt.schema';
import { QueryStudentsDto } from './dto/query-students.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Attempt.name) private readonly attemptModel: Model<AttemptDocument>,
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
}

