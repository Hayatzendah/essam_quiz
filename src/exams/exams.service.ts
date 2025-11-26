import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateExamDto, CreatePracticeExamDto } from './dto/create-exam.dto';
import { QueryExamDto } from './dto/query-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { AssignExamDto } from './dto/assign-exam.dto';
import { Exam, ExamDocument } from './schemas/exam.schema';
import type { ExamStatus } from './schemas/exam.schema';
import { ExamStatusEnum } from './schemas/exam.schema';

type ReqUser = { userId: string; role: 'student' | 'teacher' | 'admin' };

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
        'Deutschland-in-Leben Test must have exactly 2 sections: State section (3 questions) and 300 Fragen section (30 questions)',
      );
    }

    const [firstSection, secondSection] = dto.sections;

    // قائمة الولايات الألمانية المدعومة
    const validStates = [
      'Baden-Württemberg',
      'Bayern',
      'Berlin',
      'Brandenburg',
      'Bremen',
      'Hamburg',
      'Hessen',
      'Mecklenburg-Vorpommern',
      'Niedersachsen',
      'Nordrhein-Westfalen',
      'Rheinland-Pfalz',
      'Saarland',
      'Sachsen',
      'Sachsen-Anhalt',
      'Schleswig-Holstein',
      'Thüringen',
      'NRW',
    ];

    // التحقق من القسم الأول (الولاية)
    if (firstSection.quota !== 3) {
      throw new BadRequestException(
        `First section must have quota = 3 (State questions). Found: ${firstSection.quota}`,
      );
    }

    if (!firstSection.tags || firstSection.tags.length === 0) {
      throw new BadRequestException(
        'First section must have tags with state name (e.g., ["Bayern"])',
      );
    }

    const stateTag = firstSection.tags.find((tag) => validStates.includes(tag));
    if (!stateTag) {
      throw new BadRequestException(
        `First section must have a valid German state in tags. Valid states: ${validStates.join(', ')}`,
      );
    }

    // التحقق من القسم الثاني (الـ300)
    if (secondSection.quota !== 30) {
      throw new BadRequestException(
        `Second section must have quota = 30 (300 Fragen pool). Found: ${secondSection.quota}`,
      );
    }

    if (!secondSection.tags || !secondSection.tags.includes('300-Fragen')) {
      throw new BadRequestException('Second section must have tags: ["300-Fragen"]');
    }

    // التحقق من اسم القسم الثاني
    if (secondSection.name !== '300 Fragen Pool') {
      throw new BadRequestException(
        `Second section name must be "300 Fragen Pool". Found: "${secondSection.name}"`,
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
        const sum =
          (s.difficultyDistribution.easy || 0) +
          (s.difficultyDistribution.medium || 0) +
          (s.difficultyDistribution.hard || 0);
        if (sum !== s.quota) {
          throw new BadRequestException(
            `Section "${s.name}" difficultyDistribution must sum to quota`,
          );
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
      status: dto.status ?? ExamStatusEnum.DRAFT,
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

  /**
   * إنشاء Exam ديناميكي للطلاب (للتمارين)
   * - يسمح للطلاب بإنشاء Exam للتمارين فقط
   * - status: published تلقائياً
   * - بدون validation معقد
   */
  async createPracticeExam(dto: CreatePracticeExamDto, user: ReqUser) {
    // التحقق من أن sections تحتوي على items (أسئلة محددة)
    if (!dto.sections || dto.sections.length === 0) {
      throw new BadRequestException('At least one section with items is required');
    }

    for (const s of dto.sections) {
      if (!s.items || !Array.isArray(s.items) || s.items.length === 0) {
        throw new BadRequestException(`Section "${s.name}" must have items (questions)`);
      }
      // لا نسمح بـ quota للطلاب (فقط items)
      if (s.quota) {
        throw new BadRequestException(
          'Students cannot create exams with quota. Use items instead.',
        );
      }
    }

    // إضافة title تلقائياً إذا كان مفقوداً
    const title = dto.title || `Practice Exam - ${new Date().toLocaleDateString()}`;

    const userId = user.userId || (user as any).sub || (user as any).id;
    
    this.logger.log(
      `[createPracticeExam] Creating exam - title: ${title}, sections count: ${dto.sections?.length || 0}, sections: ${JSON.stringify(dto.sections?.map((s: any) => ({ name: s.name, itemsCount: s.items?.length || 0 })))}`,
    );
    
    const doc = await this.model.create({
      ...dto,
      title,
      status: ExamStatusEnum.PUBLISHED, // دائماً published للطلاب
      ownerId: new Types.ObjectId(userId),
    });

    this.logger.log(
      `[createPracticeExam] Exam created - id: ${doc._id}, sections count: ${doc.sections?.length || 0}, sections: ${JSON.stringify(doc.sections?.map((s: any) => ({ name: s?.name, itemsCount: s?.items?.length || 0, hasItems: Array.isArray(s?.items) && s.items.length > 0 })))}`,
    );

    return {
      id: String(doc._id),
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
      filter.status = ExamStatusEnum.PUBLISHED;
      
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
        const attemptCounts = await this.model.db
          .collection('attempts')
          .aggregate([
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
          ])
          .toArray();
        
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
      status: ExamStatusEnum.PUBLISHED,
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
      const attemptCounts = await this.model.db
        .collection('attempts')
        .aggregate([
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
        ])
        .toArray();
      
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

  /**
   * عرض قائمة الامتحانات المنشورة للطلاب (Public endpoint)
   * - يعرض فقط الامتحانات المنشورة (status = published)
   * - يفلتر حسب level و provider إذا تم إرسالهما
   * - Response: id, title, level, provider, timeLimitMin, sections[]
   */
  async findPublicExams(q: QueryExamDto) {
    try {
      this.logger.log(`[findPublicExams] Starting - level: ${q?.level}, provider: ${q?.provider}`);

      const filter: any = {
        status: ExamStatusEnum.PUBLISHED,
      };

      // فلترة حسب level و provider
      if (q?.level) {
        filter.level = q.level;
        this.logger.debug(`[findPublicExams] Filter by level: ${q.level}`);
      }
      if (q?.provider) {
        // استخدام regex للبحث case-insensitive (لأن provider قد يكون "telc" أو "Telc" أو "TELC")
        // استخدام string pattern بدلاً من RegExp object لـ MongoDB
        const escapedProvider = q.provider.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.provider = { $regex: `^${escapedProvider}$`, $options: 'i' };
        this.logger.debug(`[findPublicExams] Filter by provider (case-insensitive): ${q.provider}`);
      }

      this.logger.debug(`[findPublicExams] Filter: ${JSON.stringify(filter)}`);

      // Pagination (إذا كان موجوداً)
      const page = (q as any)?.page ? parseInt((q as any).page, 10) : 1;
      const limit = (q as any)?.limit ? parseInt((q as any).limit, 10) : undefined;

      // التحقق من أن page و limit صحيحين
      const skip = limit ? (page - 1) * limit : 0;
      if (skip < 0) {
        this.logger.warn(
          `[findPublicExams] Invalid pagination - page: ${page}, limit: ${limit}, skip: ${skip}`,
        );
      }

      this.logger.debug(
        `[findPublicExams] Querying database with filter: ${JSON.stringify(filter)}`,
      );
      const query = this.model.find(filter).sort({ createdAt: -1 });

      if (limit) {
        query.skip(skip).limit(limit);
        this.logger.debug(`[findPublicExams] Pagination - skip: ${skip}, limit: ${limit}`);
      }

      const items = await query.lean().exec();
      this.logger.log(`[findPublicExams] Found ${items?.length || 0} exams`);

      // التحقق من أن items موجودة
      if (!items || !Array.isArray(items)) {
        this.logger.warn(`[findPublicExams] No exams found or items is not an array`);
        return { items: [], count: 0 };
      }

      // تحويل البيانات إلى الصيغة المطلوبة
      const publicExams = items
        .map((exam: any) => {
          try {
            // التحقق من أن exam موجود
            if (!exam) {
              this.logger.warn(`[findPublicExams] Exam is null or undefined`);
              return null;
            }

            // التحقق من أن sections موجودة وليست فارغة
            if (!Array.isArray(exam.sections) || exam.sections.length === 0) {
              this.logger.warn(`[findPublicExams] Exam ${exam._id} has no sections - skipping`);
              return null;
            }

            // التحقق من أن sections تحتوي على sections صحيحة (ليست null)
            const validSections = exam.sections.filter((s: any) => {
              if (!s || s === null) return false;
              const hasItems = Array.isArray(s.items) && s.items.length > 0;
              const hasQuota = typeof s.quota === 'number' && s.quota > 0;
              return hasItems || hasQuota;
            });

            if (validSections.length === 0) {
              this.logger.warn(`[findPublicExams] Exam ${exam._id} has no valid sections (all null or empty) - skipping`);
              return null;
            }

            const sections = validSections
              .map((s: any) => {
                // حساب partsCount من items أو quota
                let partsCount = 0;
                if (Array.isArray(s.items) && s.items.length > 0) {
                  partsCount = s.items.length;
                } else if (typeof s.quota === 'number' && s.quota > 0) {
                  partsCount = s.quota;
                }

                // استخدام partsCount من الحقل إذا كان موجوداً، وإلا استخدم المحسوب
                const finalPartsCount = typeof s.partsCount === 'number' && s.partsCount > 0 
                  ? s.partsCount 
                  : partsCount;

                // بناء object مع جميع الحقول المطلوبة
                const sectionObj: any = {
                  skill: s.skill || undefined,
                  label: s.label || s.name || '', // label مطلوب دائماً
                };

                // إضافة durationMin إذا كان موجوداً
                if (typeof s.durationMin === 'number' && s.durationMin > 0) {
                  sectionObj.durationMin = s.durationMin;
                }

                // إضافة partsCount دائماً (حتى لو كان 0)
                sectionObj.partsCount = finalPartsCount;

                return sectionObj;
              })
              .filter((s: any) => s !== null);

            if (sections.length === 0) {
              this.logger.warn(`[findPublicExams] Exam ${exam._id} has no valid sections after mapping - skipping`);
              return null;
            }

            return {
              id: exam._id?.toString() || '',
              title: exam.title || '',
              level: exam.level || undefined,
              provider: exam.provider || undefined,
              timeLimitMin: exam.timeLimitMin || 0,
              sections,
            };
          } catch (error: any) {
            this.logger.error(
              `[findPublicExams] Error mapping exam ${exam?._id}: ${error.message}`,
              error.stack,
            );
            return null;
          }
        })
        .filter((exam: any) => exam !== null);

      this.logger.log(`[findPublicExams] Success - returning ${publicExams.length} exams`);
      return { items: publicExams, count: publicExams.length };
    } catch (error: any) {
      this.logger.error(`[findPublicExams] Error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * عرض تفاصيل امتحان معين للطالب (Public endpoint)
   * - يعرض بيانات الامتحان المتاحة للطالب
   * - Response: id, title, description, level, provider, timeLimitMin, attemptLimit, sections[]
   * - لا يعرض الأسئلة نفسها، فقط هيكل الأقسام
   */
  async findPublicExamById(examId: string) {
    if (!Types.ObjectId.isValid(examId)) {
      throw new BadRequestException(`Invalid exam ID format: ${examId}. Expected a valid MongoDB ObjectId (24 hex characters)`);
    }
    const doc = await this.model.findById(examId).lean().exec();
    if (!doc) throw new NotFoundException('Exam not found');

    // التحقق من أن الامتحان منشور
    if (doc.status !== ExamStatusEnum.PUBLISHED) {
      throw new NotFoundException('Exam not found');
    }

    // التحقق من أن sections موجودة وليست فارغة
    if (!Array.isArray(doc.sections) || doc.sections.length === 0) {
      throw new NotFoundException('Exam not found or has no sections');
    }

    // التحقق من أن sections تحتوي على sections صحيحة (ليست null)
    const validSections = doc.sections.filter((s: any) => {
      if (!s || s === null) return false;
      const hasItems = Array.isArray(s.items) && s.items.length > 0;
      const hasQuota = typeof s.quota === 'number' && s.quota > 0;
      return hasItems || hasQuota;
    });

    if (validSections.length === 0) {
      throw new NotFoundException('Exam not found or has no valid sections');
    }

    // تحويل الأقسام إلى الصيغة المطلوبة
    const sections = validSections.map((s: any) => {
      // حساب partsCount من items أو quota
      let partsCount = 0;
      if (Array.isArray(s.items) && s.items.length > 0) {
        partsCount = s.items.length;
      } else if (typeof s.quota === 'number' && s.quota > 0) {
        partsCount = s.quota;
      }

      return {
        skill: s.skill,
        label: s.label || s.name,
        durationMin: s.durationMin,
        partsCount: s.partsCount || partsCount,
      };
    });

    return {
      id: doc._id.toString(),
      title: doc.title,
      description: (doc as any).description,
      level: doc.level,
      provider: doc.provider,
      timeLimitMin: doc.timeLimitMin,
      attemptLimit: doc.attemptLimit,
      sections,
    };
  }

  async findById(id: string, user?: ReqUser) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid exam ID format: ${id}. Expected a valid MongoDB ObjectId (24 hex characters)`);
    }
    const doc = await this.model.findById(id).lean().exec();
    if (!doc) throw new NotFoundException('Exam not found');

    // التحكم بالوصول
    if (!user) throw new ForbiddenException();

    const userId = user.userId || (user as any).sub || (user as any).id;
    const isOwner = doc.ownerId?.toString() === userId;
    const isAdmin = user.role === 'admin';

    if (user.role === 'student') {
      if (doc.status !== ExamStatusEnum.PUBLISHED) {
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
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid exam ID format: ${id}. Expected a valid MongoDB ObjectId (24 hex characters)`);
    }
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Exam not found');

    const userId = user.userId || (user as any).sub || (user as any).id;
    const isOwner = doc.ownerId?.toString() === userId;
    const isAdmin = user.role === 'admin';
    if (!(isOwner || isAdmin)) throw new ForbiddenException('Only owner teacher or admin');

    // قيود بعد النشر
    const goingToPublish =
      dto.status === ExamStatusEnum.PUBLISHED && doc.status !== ExamStatusEnum.PUBLISHED;

    if (doc.status === ExamStatusEnum.PUBLISHED && !isAdmin) {
      // بعد النشر نقيّد التعديلات الجذرية
      const structuralChange = typeof (dto as any).sections !== 'undefined';
      if (structuralChange) {
        // السماح للمعلم المالك بتعديل الأقسام إذا كانت فارغة (لا items ولا quota)
        const hasEmptySections = doc.sections.some((s: any) => {
          const hasItems = Array.isArray(s.items) && s.items.length > 0;
          const hasQuota = typeof s.quota === 'number' && s.quota > 0;
          return !hasItems && !hasQuota;
        });
        
        if (!hasEmptySections) {
          throw new BadRequestException(
            'Cannot change sections after publish. Only admin can modify sections of published exams with existing content.',
          );
        }
        // إذا كانت الأقسام فارغة، نسمح للمعلم المالك بتعديلها
      }
    }

    // تحققات قبل النشر: لكل سكشن بquota لازم quota>0، والتوزيع يساوي الكوتا
    if (goingToPublish && (dto as any).sections) {
      for (const s of (dto as any).sections) {
        if (typeof s.quota === 'number' && s.quota > 0 && s.difficultyDistribution) {
          const sum =
            (s.difficultyDistribution.easy || 0) +
            (s.difficultyDistribution.medium || 0) +
            (s.difficultyDistribution.hard || 0);
          if (sum !== s.quota) {
            throw new BadRequestException(
              `Section "${s.name}" difficultyDistribution must sum to quota`,
            );
          }
        }
      }
    }

    // Validation خاص لـ "Deutschland-in-Leben" عند التحديث
    const updatedProvider = dto.provider !== undefined ? dto.provider : doc.provider;
    if (updatedProvider === 'Deutschland-in-Leben') {
      const updatedDto = { ...dto, sections: (dto as any).sections || doc.sections };
      this.validateDeutschlandInLebenStructure(updatedDto as CreateExamDto);
    }

    // تطبيق التحديث
    // معالجة خاصة لـ sections لأن Object.assign قد لا يعمل بشكل صحيح مع nested arrays
    if ((dto as any).sections !== undefined) {
      this.logger.log(
        `[updateExam] Updating sections - examId: ${id}, old sections: ${JSON.stringify(doc.sections)}, new sections: ${JSON.stringify((dto as any).sections)}`,
      );
      // استخدام set() و markModified لضمان أن Mongoose يحدث الحقل بشكل صحيح
      doc.set('sections', (dto as any).sections);
      doc.markModified('sections');
    }
    
    // تطبيق باقي التحديثات
    const { sections, ...restDto } = dto as any;
    Object.assign(doc, restDto);

    // لو في تعديل في البنية قبل النشر، عادي — سيؤثر على اختيار الأسئلة لاحقًا في attempts
    this.logger.log(
      `[updateExam] Saving exam - examId: ${id}, sections before save: ${JSON.stringify(doc.sections)}`,
    );
    await doc.save();
    this.logger.log(
      `[updateExam] Exam saved - examId: ${id}, sections after save: ${JSON.stringify(doc.sections)}`,
    );
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

    if (dto.classId) (doc as any).assignedClassId = new Types.ObjectId(dto.classId);
    if (dto.studentIds) (doc as any).assignedStudentIds = dto.studentIds.map((id) => new Types.ObjectId(id));
    await doc.save();

    return { assignedClassId: (doc as any).assignedClassId, assignedStudentIds: (doc as any).assignedStudentIds };
  }

  async removeExam(id: string, user: ReqUser, hard: boolean = false) {
    if (!user) throw new ForbiddenException();
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Exam not found');

    const userId = user.userId || (user as any).sub || (user as any).id;
    const isOwner = doc.ownerId?.toString() === userId;
    const isAdmin = user.role === 'admin';
    if (!(isOwner || isAdmin))
      throw new ForbiddenException('Only owner teacher or admin can delete');

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
      doc.status = 'archived' as any;
      await doc.save();
      return { message: 'Exam archived successfully', id: doc._id, status: doc.status };
    }
  }

  async debugExamStructure(id: string) {
    const exam = await this.model.findById(id).exec();
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const QuestionModel = this.model.db.collection('questions');
    const debugInfo: any = {
      examId: (exam._id as Types.ObjectId).toString(),
      examTitle: exam.title,
      provider: exam.provider,
      level: exam.level,
      status: exam.status,
      sections: [],
      totalQuestionsAvailable: 0,
      issues: [],
    };

    if (!exam.sections || exam.sections.length === 0) {
      debugInfo.issues.push('No sections defined in exam');
      return debugInfo;
    }

    for (const section of exam.sections) {
      const sectionInfo: any = {
        name: section.name,
        quota: section.quota,
        tags: section.tags || [],
        difficultyDistribution: section.difficultyDistribution,
        availableQuestions: {},
        totalAvailable: 0,
        issues: [],
      };

      // البحث عن الأسئلة المتاحة لكل مستوى صعوبة
      const baseQuery: any = {
        status: 'published',
        level: exam.level,
      };

      if (section.tags && section.tags.length > 0) {
        baseQuery.tags = { $in: section.tags };
      }

      if (section.difficultyDistribution) {
        for (const [difficulty, count] of Object.entries(section.difficultyDistribution)) {
          const query = { ...baseQuery, difficulty };
          const available = await QuestionModel.countDocuments(query);
          sectionInfo.availableQuestions[difficulty] = available;
          sectionInfo.totalAvailable += available;

          if (available < count) {
            sectionInfo.issues.push(
              `Need ${count} ${difficulty} questions, but only ${available} available`,
            );
          }
        }
      } else {
        // بدون توزيع صعوبة
        const available = await QuestionModel.countDocuments(baseQuery);
        sectionInfo.totalAvailable = available;
        if (section.quota && available < section.quota) {
          sectionInfo.issues.push(
            `Need ${section.quota} questions, but only ${available} available`,
          );
        }
      }

      debugInfo.sections.push(sectionInfo);
      debugInfo.totalQuestionsAvailable += sectionInfo.totalAvailable;

      if (sectionInfo.issues.length > 0) {
        debugInfo.issues.push(...sectionInfo.issues.map((i: string) => `Section "${section.name}": ${i}`));
      }
    }

    return debugInfo;
  }
}
