import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateExamDto } from './dto/create-exam.dto';
import { QueryExamDto } from './dto/query-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { AssignExamDto } from './dto/assign-exam.dto';
import { Exam, ExamDocument, ExamStatus } from './schemas/exam.schema';

type ReqUser = { userId: string; role: 'student'|'teacher'|'admin' };

@Injectable()
export class ExamsService {
  private readonly logger = new Logger(ExamsService.name);

  constructor(@InjectModel(Exam.name) private readonly model: Model<ExamDocument>) {}

  private assertTeacherOrAdmin(user: ReqUser) {
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      throw new ForbiddenException('Only teachers/admins allowed');
    }
  }

  /**
   * التحقق من هيكل "Deutschland-in-Leben" Test
   * يجب أن يحتوي على قسمين:
   * 1. قسم الولاية: quota = 3, tags = [اسم الولاية]
   * 2. قسم الـ300: quota = 30, tags = ["300-Fragen"]
   */
  private validateDeutschlandInLebenStructure(dto: CreateExamDto) {
    // التحقق من level
    if (dto.level && dto.level !== 'B1') {
      throw new BadRequestException('Deutschland-in-Leben Test must have level "B1"');
    }

    // التحقق من عدد الأقسام
    if (!dto.sections || dto.sections.length !== 2) {
      throw new BadRequestException(
        'Deutschland-in-Leben Test must have exactly 2 sections: State section (3 questions) and 300 Fragen section (30 questions)'
      );
    }

    const [firstSection, secondSection] = dto.sections;

    // قائمة الولايات الألمانية المدعومة
    const validStates = [
      'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen',
      'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen',
      'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen',
      'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen', 'NRW'
    ];

    // التحقق من القسم الأول (الولاية)
    if (firstSection.quota !== 3) {
      throw new BadRequestException(
        `First section must have quota = 3 (State questions). Found: ${firstSection.quota}`
      );
    }

    if (!firstSection.tags || firstSection.tags.length === 0) {
      throw new BadRequestException('First section must have tags with state name (e.g., ["Bayern"])');
    }

    const stateTag = firstSection.tags.find(tag => validStates.includes(tag));
    if (!stateTag) {
      throw new BadRequestException(
        `First section must have a valid German state in tags. Valid states: ${validStates.join(', ')}`
      );
    }

    // التحقق من القسم الثاني (الـ300)
    if (secondSection.quota !== 30) {
      throw new BadRequestException(
        `Second section must have quota = 30 (300 Fragen pool). Found: ${secondSection.quota}`
      );
    }

    if (!secondSection.tags || !secondSection.tags.includes('300-Fragen')) {
      throw new BadRequestException('Second section must have tags: ["300-Fragen"]');
    }

    // التحقق من اسم القسم الثاني
    if (secondSection.name !== '300 Fragen Pool') {
      throw new BadRequestException(
        `Second section name must be "300 Fragen Pool". Found: "${secondSection.name}"`
      );
    }
  }

  async createExam(dto: CreateExamDto, user: ReqUser) {
    this.assertTeacherOrAdmin(user);

    // تحققات إضافية على مستوى الخدمة
    for (const s of dto.sections) {
      const hasItems = Array.isArray(s.items) && s.items.length > 0;
      const hasQuota = typeof s.quota === 'number' && s.quota > 0;
      if (hasItems && hasQuota) {
        throw new BadRequestException(`Section "${s.name}" cannot have both items and quota`);
      }
      if (!hasItems && !hasQuota) {
        throw new BadRequestException(`Section "${s.name}" must have either items or quota`);
      }
      if (hasQuota && s.difficultyDistribution) {
        const sum = (s.difficultyDistribution.easy || 0)
                  + (s.difficultyDistribution.medium || 0)
                  + (s.difficultyDistribution.hard || 0);
        if (sum !== s.quota) {
          throw new BadRequestException(`Section "${s.name}" difficultyDistribution must sum to quota`);
        }
      }
    }

    // Validation خاص لـ "Deutschland-in-Leben" Test
    if (dto.provider === 'Deutschland-in-Leben') {
      this.validateDeutschlandInLebenStructure(dto);
    }

    const userId = user.userId || (user as any).sub || (user as any).id;
    const doc = await this.model.create({
      ...dto,
      status: dto.status ?? ExamStatus.DRAFT,
      ownerId: new Types.ObjectId(userId),
    });

    return {
      id: doc._id,
      title: doc.title,
      level: doc.level,
      status: doc.status,
      sections: doc.sections,
      randomizeQuestions: doc.randomizeQuestions,
      attemptLimit: doc.attemptLimit,
      ownerId: doc.ownerId,
      createdAt: (doc as any).createdAt,
    };
  }

  async findAll(user: ReqUser, q: QueryExamDto) {
    const filter: any = {};

    // الطالب: يشوف فقط الامتحانات المنشورة
    if (user.role === 'student') {
      filter.status = ExamStatus.PUBLISHED;
      
      // فلترة حسب assignedStudentIds (غير مخصص أو مخصص له)
      const userId = user.userId || (user as any).sub || (user as any).id;
      const studentId = new Types.ObjectId(userId);
      filter.$or = [
        { assignedStudentIds: { $exists: false } },
        { assignedStudentIds: { $size: 0 } },
        { assignedStudentIds: studentId },
      ];
    }
    // المدرس: يشوف امتحاناته فقط
    else if (user.role === 'teacher') {
      const userId = user.userId || (user as any).sub || (user as any).id;
      filter.ownerId = new Types.ObjectId(userId);
      if (q?.status) filter.status = q.status;
    }
    // الأدمن: يشوف الكل (يمكنه الفلترة حسب status)
    else if (user.role === 'admin') {
      if (q?.status) filter.status = q.status;
    }

    // فلترة مشتركة
    if (q?.level) filter.level = q.level;
    if (q?.provider) filter.provider = q.provider;

    // فلترة حسب state (الولاية) - البحث في sections.tags
    // يجب أن يكون هناك قسم واحد على الأقل يحتوي على الولاية المطلوبة
    if (q?.state) {
      // البحث عن امتحانات تحتوي على قسم واحد على الأقل مع tags تحتوي على الولاية
      filter['sections.tags'] = { $in: [q.state] };
      this.logger.debug(`Filtering exams by state: ${q.state}`);
    }

    const items = await this.model.find(filter).sort({ createdAt: -1 }).lean().exec();
    
    // للطلاب: فلترة حسب attemptLimit
    if (user.role === 'student') {
      const userId = user.userId || (user as any).sub || (user as any).id;
      const studentId = new Types.ObjectId(userId);
      const examIds = items.map((e: any) => e._id);
      
      if (examIds.length > 0) {
        const attemptCounts = await this.model.db.collection('attempts').aggregate([
          {
            $match: {
              studentId,
              examId: { $in: examIds },
            },
          },
          {
            $group: {
              _id: '$examId',
              count: { $sum: 1 },
            },
          },
        ]).toArray();
        
        const attemptCountMap = new Map(attemptCounts.map((a: any) => [a._id.toString(), a.count]));
        
        const availableExams: any[] = [];
        for (const exam of items) {
          const attemptCount = attemptCountMap.get(exam._id.toString()) || 0;
          const attemptLimit = exam.attemptLimit || 0;
          if (attemptLimit === 0 || attemptCount < attemptLimit) {
            availableExams.push(exam);
          }
        }
        return { items: availableExams, count: availableExams.length };
      }
    }

    return { items, count: items.length };
  }

  async findAvailableForStudent(user: ReqUser, q: QueryExamDto) {
    if (!user || user.role !== 'student') {
      throw new ForbiddenException('Only students can access available exams');
    }

    const userId = user.userId || (user as any).sub || (user as any).id;
    const studentId = new Types.ObjectId(userId);

    const filter: any = {
      status: ExamStatus.PUBLISHED,
      $or: [
        { assignedStudentIds: { $exists: false } }, // غير مخصص لأحد
        { assignedStudentIds: { $size: 0 } }, // قائمة فارغة
        { assignedStudentIds: studentId }, // مخصص لهذا الطالب
      ],
    };

    if (q?.level) filter.level = q.level;
    if (q?.provider) filter.provider = q.provider;

    const items = await this.model.find(filter).sort({ createdAt: -1 }).lean().exec();
    
    // فلترة حسب attemptLimit
    const availableExams: any[] = [];
    const examIds = items.map((e: any) => e._id);
    
    if (examIds.length > 0) {
      const attemptCounts = await this.model.db.collection('attempts').aggregate([
        {
          $match: {
            studentId,
            examId: { $in: examIds },
          },
        },
        {
          $group: {
            _id: '$examId',
            count: { $sum: 1 },
          },
        },
      ]).toArray();
      
      const attemptCountMap = new Map(attemptCounts.map((a: any) => [a._id.toString(), a.count]));
      
      for (const exam of items) {
        const attemptCount = attemptCountMap.get(exam._id.toString()) || 0;
        const attemptLimit = exam.attemptLimit || 0;
        if (attemptLimit === 0 || attemptCount < attemptLimit) {
          availableExams.push(exam);
        }
      }
    } else {
      availableExams.push(...items);
    }

    return { items: availableExams, count: availableExams.length };
  }

  async findById(id: string, user?: ReqUser) {
    const doc = await this.model.findById(id).lean().exec();
    if (!doc) throw new NotFoundException('Exam not found');

    // التحكم بالوصول
    if (!user) throw new ForbiddenException();

    const userId = user.userId || (user as any).sub || (user as any).id;
    const isOwner = doc.ownerId?.toString() === userId;
    const isAdmin = user.role === 'admin';

    if (user.role === 'student') {
      if (doc.status !== ExamStatus.PUBLISHED) {
        throw new ForbiddenException('Students can view published exams only');
      }
      // إخفاء التفاصيل الحساسة لو كانت عشوائية
      const safeSections = doc.sections.map((s: any) => {
        const hasQuota = typeof s.quota === 'number' && s.quota > 0;
        if (hasQuota || doc.randomizeQuestions) {
          return { name: s.name, quota: s.quota, difficultyDistribution: s.difficultyDistribution };
        }
        // لو ثابتة ومش عشوائية ممكن برضه نخفي الـ questionIds لو بتحبي (حسب سياستك)
        return { ...s, items: undefined };
      });
      return { ...doc, sections: safeSections };
    }

    if (isOwner || isAdmin) return doc;

    // مدرس غير مالك: ما نسمحش
    if (user.role === 'teacher') {
      throw new ForbiddenException('Only owner teacher or admin can view');
    }

    throw new ForbiddenException();
  }

  async updateExam(id: string, dto: UpdateExamDto, user: ReqUser) {
    if (!user) throw new ForbiddenException();
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Exam not found');

    const userId = user.userId || (user as any).sub || (user as any).id;
    const isOwner = doc.ownerId?.toString() === userId;
    const isAdmin = user.role === 'admin';
    if (!(isOwner || isAdmin)) throw new ForbiddenException('Only owner teacher or admin');

    // قيود بعد النشر
    const goingToPublish = dto.status === ExamStatus.PUBLISHED && doc.status !== ExamStatus.PUBLISHED;

    if (doc.status === ExamStatus.PUBLISHED && !isAdmin) {
      // بعد النشر نقيّد التعديلات الجذرية
      const structuralChange = typeof dto.sections !== 'undefined';
      if (structuralChange) {
        throw new BadRequestException('Cannot change sections after publish (admin only if allowed)');
      }
    }

    // تحققات قبل النشر: لكل سكشن بquota لازم quota>0، والتوزيع يساوي الكوتا
    if (goingToPublish && dto.sections) {
      for (const s of dto.sections) {
        if (typeof s.quota === 'number' && s.quota > 0 && s.difficultyDistribution) {
          const sum = (s.difficultyDistribution.easy || 0)
                    + (s.difficultyDistribution.medium || 0)
                    + (s.difficultyDistribution.hard || 0);
          if (sum !== s.quota) {
            throw new BadRequestException(`Section "${s.name}" difficultyDistribution must sum to quota`);
          }
        }
      }
    }

    // Validation خاص لـ "Deutschland-in-Leben" عند التحديث
    const updatedProvider = dto.provider !== undefined ? dto.provider : doc.provider;
    if (updatedProvider === 'Deutschland-in-Leben') {
      const updatedDto = { ...dto, sections: dto.sections || doc.sections };
      this.validateDeutschlandInLebenStructure(updatedDto as CreateExamDto);
    }

    // تطبيق التحديث
    Object.assign(doc, dto);

    // لو في تعديل في البنية قبل النشر، عادي — سيؤثر على اختيار الأسئلة لاحقًا في attempts
    await doc.save();
    return doc.toObject();
  }

  async assignExam(id: string, dto: AssignExamDto, user: ReqUser) {
    if (!user) throw new ForbiddenException();
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Exam not found');

    const userId = user.userId || (user as any).sub || (user as any).id;
    const isOwner = doc.ownerId?.toString() === userId;
    const isAdmin = user.role === 'admin';
    if (!(isOwner || isAdmin)) throw new ForbiddenException('Only owner teacher or admin');

    if (!dto.classId && !dto.studentIds) {
      throw new BadRequestException('Provide classId or studentIds');
    }

    if (dto.classId) doc.assignedClassId = new Types.ObjectId(dto.classId);
    if (dto.studentIds) doc.assignedStudentIds = dto.studentIds.map(id => new Types.ObjectId(id));
    await doc.save();

    return { assignedClassId: doc.assignedClassId, assignedStudentIds: doc.assignedStudentIds };
  }

  async removeExam(id: string, user: ReqUser, hard: boolean = false) {
    if (!user) throw new ForbiddenException();
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Exam not found');

    const userId = user.userId || (user as any).sub || (user as any).id;
    const isOwner = doc.ownerId?.toString() === userId;
    const isAdmin = user.role === 'admin';
    if (!(isOwner || isAdmin)) throw new ForbiddenException('Only owner teacher or admin can delete');

    // التحقق من وجود محاولات مرتبطة بالامتحان
    const AttemptModel = this.model.db.collection('attempts');
    const attemptCount = await AttemptModel.countDocuments({ examId: new Types.ObjectId(id) });
    
    if (attemptCount > 0 && !hard) {
      throw new BadRequestException({
        code: 'EXAM_HAS_ATTEMPTS',
        message: `Cannot delete exam with ${attemptCount} attempt(s). Use hard=true to force delete.`,
        attemptCount,
      });
    }

    if (hard) {
      // Hard delete: حذف نهائي
      await this.model.findByIdAndDelete(id).exec();
      return { message: 'Exam deleted permanently', id };
    } else {
      // Soft delete: تغيير الحالة إلى archived
      doc.status = ExamStatus.ARCHIVED;
      await doc.save();
      return { message: 'Exam archived successfully', id: doc._id, status: doc.status };
    }
  }
}

