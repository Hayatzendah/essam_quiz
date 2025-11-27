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

    // تنظيف sections من null/undefined قبل التحقق
    if (!dto.sections || !Array.isArray(dto.sections)) {
      throw new BadRequestException('Exam must have at least one section');
    }
    
    // إزالة null/undefined sections
    const cleanedSections = dto.sections.filter((s: any) => s !== null && s !== undefined);
    if (cleanedSections.length === 0) {
      throw new BadRequestException('Exam must have at least one valid section (null sections are not allowed)');
    }
    
    // تحققات إضافية على مستوى الخدمة
    for (const s of cleanedSections) {
      if (!s || typeof s !== 'object') {
        throw new BadRequestException('Each section must be a valid object');
      }
      
      // تنظيف items من null
      if (s.items && Array.isArray(s.items)) {
        s.items = s.items.filter((item: any) => item !== null && item !== undefined && item.questionId);
      }
      
      const hasItems = Array.isArray(s.items) && s.items.length > 0;
      const hasQuota = typeof s.quota === 'number' && s.quota > 0;
      
      if (hasItems && hasQuota) {
        throw new BadRequestException(`Section "${s.name || 'unnamed'}" cannot have both items and quota`);
      }
      if (!hasItems && !hasQuota) {
        throw new BadRequestException(`Section "${s.name || 'unnamed'}" must have either items or quota`);
      }
      if (hasQuota && s.difficultyDistribution) {
        const sum =
          (s.difficultyDistribution.easy || 0) +
          (s.difficultyDistribution.medium || 0) +
          (s.difficultyDistribution.hard || 0);
        if (sum !== s.quota) {
          throw new BadRequestException(
            `Section "${s.name || 'unnamed'}" difficultyDistribution must sum to quota`,
          );
        }
      }
    }
    
    // استبدال sections بالنسخة المنظفة
    dto.sections = cleanedSections;

    // Validation خاص لـ "Deutschland-in-Leben" Test
    if (dto.provider === 'Deutschland-in-Leben') {
      this.validateDeutschlandInLebenStructure(dto);
    }

    const userId = user.userId || (user as any).sub || (user as any).id;
    
    // تحويل questionId في items إلى ObjectId إذا كان string
    // وإزالة أي sections null أو undefined
    const processedDto = { ...dto };
    if (processedDto.sections && Array.isArray(processedDto.sections)) {
      // إزالة null/undefined sections
      processedDto.sections = processedDto.sections
        .filter((section: any) => section !== null && section !== undefined)
        .map((section: any) => {
          if (section.items && Array.isArray(section.items)) {
            // إزالة null/undefined items
            section.items = section.items
              .filter((item: any) => item !== null && item !== undefined)
              .map((item: any) => {
                if (item.questionId) {
                  return {
                    ...item,
                    questionId: item.questionId instanceof Types.ObjectId 
                      ? item.questionId 
                      : new Types.ObjectId(item.questionId),
                  };
                }
                return item;
              });
          }
          return section;
        });
      
      // التحقق من أن هناك sections صحيحة بعد التنظيف
      if (processedDto.sections.length === 0) {
        throw new BadRequestException('Exam must have at least one valid section');
      }
    }
    
    // Ensure sections is always an array (never null or undefined)
    const normalizedSections = Array.isArray(processedDto.sections) 
      ? processedDto.sections.filter((s: any) => s !== null && s !== undefined)
      : [];
    
    const doc = await this.model.create({
      ...processedDto,
      sections: normalizedSections, // Explicitly set sections to ensure no null values
      status: processedDto.status ?? ExamStatusEnum.DRAFT,
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
    if (!dto.sections || !Array.isArray(dto.sections) || dto.sections.length === 0) {
      throw new BadRequestException('At least one section with items is required');
    }

    // تنظيف sections من null/undefined
    const cleanedSections = dto.sections.filter((s: any) => s !== null && s !== undefined);
    if (cleanedSections.length === 0) {
      throw new BadRequestException('At least one valid section is required (null sections are not allowed)');
    }

    for (const s of cleanedSections) {
      if (!s || typeof s !== 'object') {
        throw new BadRequestException('Each section must be a valid object');
      }
      
      // تنظيف items من null و items بدون questionId
      if (s.items && Array.isArray(s.items)) {
        s.items = s.items.filter((item: any) => 
          item !== null && 
          item !== undefined && 
          item.questionId && 
          item.questionId !== null
        );
      }
      
      if (!s.items || !Array.isArray(s.items) || s.items.length === 0) {
        throw new BadRequestException(`Section "${s.name || 'unnamed'}" must have at least one valid item with questionId`);
      }
      
      // لا نسمح بـ quota للطلاب (فقط items)
      if (s.quota) {
        throw new BadRequestException(
          'Students cannot create exams with quota. Use items instead.',
        );
      }
    }
    
    // استبدال sections بالنسخة المنظفة
    dto.sections = cleanedSections;

    // إضافة title تلقائياً إذا كان مفقوداً
    const title = dto.title || `Practice Exam - ${new Date().toLocaleDateString()}`;

    const userId = user.userId || (user as any).sub || (user as any).id;
    
    // تنظيف sections من null/undefined
    const processedDto = { ...dto };
    if (processedDto.sections && Array.isArray(processedDto.sections)) {
      processedDto.sections = processedDto.sections
        .filter((section: any) => section !== null && section !== undefined)
        .map((section: any) => {
          if (section.items && Array.isArray(section.items)) {
            section.items = section.items
              .filter((item: any) => item !== null && item !== undefined)
              .map((item: any) => {
                if (item.questionId) {
                  return {
                    ...item,
                    questionId: item.questionId instanceof Types.ObjectId 
                      ? item.questionId 
                      : new Types.ObjectId(item.questionId),
                  };
                }
                return item;
              });
          }
          return section;
        });
      
      if (processedDto.sections.length === 0) {
        throw new BadRequestException('Exam must have at least one valid section');
      }
    }
    
    // Ensure sections is always an array (never null or undefined)
    const normalizedSections = Array.isArray(processedDto.sections) 
      ? processedDto.sections.filter((s: any) => s !== null && s !== undefined)
      : [];
    
    this.logger.log(
      `[createPracticeExam] Creating exam - title: ${title}, sections count: ${normalizedSections.length}, sections: ${JSON.stringify(normalizedSections.map((s: any) => ({ name: s.name, itemsCount: s.items?.length || 0 })))}`,
    );
    
    const doc = await this.model.create({
      ...processedDto,
      title,
      sections: normalizedSections, // Explicitly set sections to ensure no null values
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

    // Normalize sections: ensure it's an array and filter out null values
    const normalizedSections = Array.isArray(doc.sections) 
      ? doc.sections.filter((s: any) => s !== null && s !== undefined)
      : [];
    
    const docWithNormalizedSections = { ...doc, sections: normalizedSections };

    const userId = user.userId || (user as any).sub || (user as any).id;
    const isOwner = doc.ownerId?.toString() === userId;
    const isAdmin = user.role === 'admin';

    if (user.role === 'student') {
      if (doc.status !== ExamStatusEnum.PUBLISHED) {
        throw new ForbiddenException('Students can view published exams only');
      }
      // إخفاء التفاصيل الحساسة لو كانت عشوائية
      const safeSections = normalizedSections
        .map((s: any) => {
          const hasQuota = typeof s?.quota === 'number' && s.quota > 0;
          if (hasQuota || doc.randomizeQuestions) {
            return { name: s?.name || 'Unnamed Section', quota: s?.quota, difficultyDistribution: s?.difficultyDistribution };
          }
          // لو ثابتة ومش عشوائية ممكن برضه نخفي الـ questionIds لو بتحبي (حسب سياستك)
          return { ...s, items: undefined };
        });
      return { ...docWithNormalizedSections, sections: safeSections };
    }

    if (isOwner || isAdmin) return docWithNormalizedSections;

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
      
      // تحويل questionId في items إلى ObjectId إذا كان string
      // وإزالة أي sections null أو undefined
      const processedSections = (dto as any).sections
        .filter((section: any) => section !== null && section !== undefined)
        .map((section: any) => {
          if (section.items && Array.isArray(section.items)) {
            // إزالة null/undefined items
            section.items = section.items
              .filter((item: any) => item !== null && item !== undefined)
              .map((item: any) => {
                if (item.questionId) {
                  return {
                    ...item,
                    questionId: item.questionId instanceof Types.ObjectId 
                      ? item.questionId 
                      : new Types.ObjectId(item.questionId),
                  };
                }
                return item;
              });
          }
          return section;
        });
      
      // التحقق من أن هناك sections صحيحة بعد التنظيف
      if (processedSections.length === 0) {
        throw new BadRequestException('Exam must have at least one valid section');
      }
      
      // Final normalization: ensure no null values
      const normalizedSections = processedSections.filter((s: any) => s !== null && s !== undefined);
      
      if (normalizedSections.length === 0) {
        throw new BadRequestException('Exam must have at least one valid section (after filtering null values)');
      }
      
      this.logger.log(
        `[updateExam] Processed sections with ObjectId conversion - sections: ${JSON.stringify(normalizedSections.map((s: any) => ({ name: s.name, itemsCount: s.items?.length || 0, items: s.items?.map((i: any) => ({ questionId: String(i.questionId) })) || [] })))}`,
      );
      
      // استخدام set() و markModified لضمان أن Mongoose يحدث الحقل بشكل صحيح
      doc.set('sections', normalizedSections);
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

  /**
   * إصلاح الامتحان تلقائياً: إضافة quota للأقسام الفارغة
   * - للاستخدام من قبل admin فقط
   * - يفحص كل section وإذا كان فارغاً (لا items ولا quota) يضيف quota = 5
   */
  async fixEmptySections(examId: string, user: ReqUser) {
    if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
      throw new ForbiddenException('Only admin or teacher can fix exams');
    }

    if (!Types.ObjectId.isValid(examId)) {
      throw new BadRequestException(`Invalid exam ID format: ${examId}`);
    }

    const doc = await this.model.findById(examId).exec();
    if (!doc) throw new NotFoundException('Exam not found');

    // التحقق من أن المعلم هو مالك الامتحان
    if (user.role === 'teacher') {
      const userId = user.userId || (user as any).sub || (user as any).id;
      const ownerIdStr = doc.ownerId?.toString();
      const userIdStr = String(userId);
      
      this.logger.log(
        `[fixEmptySections] Checking ownership - examId: ${examId}, ownerId: ${ownerIdStr}, userId: ${userIdStr}`,
      );
      
      // مقارنة مرنة: ObjectId vs string
      const isOwner = ownerIdStr === userIdStr || 
                      (doc.ownerId && String(doc.ownerId) === userIdStr) ||
                      (ownerIdStr && ownerIdStr === String(userId));
      
      if (!isOwner) {
        this.logger.warn(
          `[fixEmptySections] Access denied - examId: ${examId}, ownerId: ${ownerIdStr}, userId: ${userIdStr}`,
        );
        throw new ForbiddenException('Only the exam owner can fix this exam');
      }
      
      this.logger.log(`[fixEmptySections] Ownership verified - examId: ${examId}`);
    }

    this.logger.log(
      `[fixEmptySections] Fixing exam - examId: ${examId}, current sections: ${JSON.stringify(doc.sections.map((s: any) => ({ name: s?.name, hasItems: Array.isArray(s?.items) && s.items.length > 0, hasQuota: typeof s?.quota === 'number' && s.quota > 0 })))}`,
    );

    let fixed = false;
    const updatedSections = doc.sections.map((s: any, index: number) => {
      if (!s || s === null) {
        // Section is null - create new section with quota
        this.logger.warn(`[fixEmptySections] Section ${index + 1} is null - creating new section with quota=5`);
        fixed = true;
        return {
          name: `Section ${index + 1}`,
          quota: 5,
          tags: [],
        };
      }

      const hasItems = Array.isArray(s.items) && s.items.length > 0;
      const hasQuota = typeof s.quota === 'number' && s.quota > 0;

      if (!hasItems && !hasQuota) {
        // Section is empty - add quota
        this.logger.warn(`[fixEmptySections] Section "${s.name || `Section ${index + 1}`}" is empty - adding quota=5`);
        fixed = true;
        return {
          ...s,
          quota: 5,
        };
      }

      // Section is valid - keep as is
      return s;
    });

    if (!fixed) {
      this.logger.log(`[fixEmptySections] No empty sections found - exam is already valid`);
      return {
        success: true,
        message: 'Exam is already valid - no empty sections found',
        examId,
        sections: doc.sections,
      };
    }

    // Update exam with fixed sections
    doc.set('sections', updatedSections);
    doc.markModified('sections');
    await doc.save();

    this.logger.log(
      `[fixEmptySections] Exam fixed successfully - examId: ${examId}, updated sections: ${JSON.stringify(updatedSections.map((s: any) => ({ name: s?.name, quota: s?.quota, itemsCount: s?.items?.length || 0 })))}`,
    );

    return {
      success: true,
      message: 'Exam sections fixed successfully',
      examId,
      sections: doc.sections,
      fixedSections: updatedSections.filter((s: any, index: number) => {
        const original = doc.sections[index];
        const hasItems = Array.isArray(s.items) && s.items.length > 0;
        const hasQuota = typeof s.quota === 'number' && s.quota > 0;
        const originalHasItems = Array.isArray(original?.items) && original.items.length > 0;
        const originalHasQuota = typeof original?.quota === 'number' && original.quota > 0;
        return (hasItems || hasQuota) && !(originalHasItems || originalHasQuota);
      }),
    };
  }

  /**
   * إيجاد جميع الامتحانات التي sections فارغة
   * - للاستخدام من قبل admin فقط
   */
  async findExamsWithEmptySections(user: ReqUser) {
    if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
      throw new ForbiddenException('Only admin or teacher can view this information');
    }

    const userId = user.userId || (user as any).sub || (user as any).id;
    const isAdmin = user.role === 'admin';
    
    // Admin: جميع الامتحانات، Teacher: امتحاناته فقط
    // نستخدم $or للبحث في ownerId سواء كان ObjectId أو string
    const query = isAdmin 
      ? {} 
      : {
          $or: [
            { ownerId: new Types.ObjectId(userId) },
            { ownerId: userId },
          ],
        };
    this.logger.log(
      `[findExamsWithEmptySections] userId: ${userId}, role: ${user.role}, isAdmin: ${isAdmin}`,
    );
    const allExams = await this.model.find(query).lean().exec();
    this.logger.log(
      `[findExamsWithEmptySections] Found ${allExams.length} exam(s)`,
    );
    
    const examsWithEmptySections = allExams
      .map((exam: any) => {
        this.logger.log(
          `[findExamsWithEmptySections] Checking exam: ${exam._id?.toString() || String(exam._id)}, title: ${exam.title}, sections count: ${exam.sections?.length || 0}`,
        );
        
        // التحقق من وجود sections
        if (!Array.isArray(exam.sections) || exam.sections.length === 0) {
          this.logger.warn(
            `[findExamsWithEmptySections] Exam ${exam._id?.toString() || String(exam._id)} has no sections array or empty array`,
          );
          return {
            examId: exam._id?.toString() || String(exam._id),
            title: exam.title,
            level: exam.level,
            provider: exam.provider,
            status: exam.status,
            emptySections: [],
            reason: 'No sections array or empty array',
          };
        }

        // التحقق من أن جميع الـ sections ليست null
        const allSectionsAreNull = exam.sections.every((s: any) => s === null || s === undefined);
        if (allSectionsAreNull) {
          this.logger.warn(
            `[findExamsWithEmptySections] Exam ${exam._id?.toString() || String(exam._id)} has all sections as null`,
          );
          return {
            examId: exam._id?.toString() || String(exam._id),
            title: exam.title,
            level: exam.level,
            provider: exam.provider,
            status: exam.status,
            emptySections: exam.sections.map((s: any, index: number) => ({
              index: index + 1,
              name: `Section ${index + 1}`,
              reason: 'Section is null',
            })),
            reason: 'All sections are null',
          };
        }

        const emptySections = exam.sections
          .map((s: any, index: number) => {
            if (!s || s === null || s === undefined) {
              this.logger.warn(
                `[findExamsWithEmptySections] Exam ${exam._id?.toString() || String(exam._id)} - Section ${index + 1} is null/undefined`,
              );
              return {
                index: index + 1,
                name: `Section ${index + 1}`,
                reason: 'Section is null or undefined',
              };
            }

            const hasItems = Array.isArray(s.items) && s.items.length > 0;
            const hasQuota = typeof s.quota === 'number' && s.quota > 0;

            if (!hasItems && !hasQuota) {
              this.logger.warn(
                `[findExamsWithEmptySections] Exam ${exam._id?.toString() || String(exam._id)} - Section "${s.name || s.section || `Section ${index + 1}`}" is empty (no items, no quota)`,
              );
              return {
                index: index + 1,
                name: s.name || s.section || `Section ${index + 1}`,
                reason: 'No items and no quota',
              };
            }

            return null;
          })
          .filter((s: any) => s !== null);

        if (emptySections.length === 0) {
          return null;
        }

        this.logger.warn(
          `[findExamsWithEmptySections] Exam ${exam._id?.toString() || String(exam._id)} has ${emptySections.length} empty section(s)`,
        );

        return {
          examId: exam._id?.toString() || String(exam._id),
          title: exam.title,
          level: exam.level,
          provider: exam.provider,
          status: exam.status,
          emptySections,
        };
      })
      .filter((exam: any) => exam !== null);

    return {
      totalExams: allExams.length,
      examsWithEmptySections: examsWithEmptySections.length,
      exams: examsWithEmptySections,
    };
  }

  /**
   * فحص تفاصيل sections الامتحان
   * - للاستخدام من قبل admin/teacher
   */
  async checkExamSections(examId: string, user: ReqUser) {
    if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
      throw new ForbiddenException('Only admin or teacher can view this information');
    }

    if (!Types.ObjectId.isValid(examId)) {
      throw new BadRequestException(`Invalid exam ID format: ${examId}`);
    }

    const exam = await this.model.findById(examId).lean().exec();
    if (!exam) throw new NotFoundException('Exam not found');

    // التحقق من أن المعلم هو مالك الامتحان
    if (user.role === 'teacher') {
      const userId = user.userId || (user as any).sub || (user as any).id;
      const ownerIdStr = (exam as any).ownerId?.toString();
      const userIdStr = String(userId);
      
      const isOwner = ownerIdStr === userIdStr || 
                      ((exam as any).ownerId && String((exam as any).ownerId) === userIdStr) ||
                      (ownerIdStr && ownerIdStr === String(userId));
      
      if (!isOwner) {
        throw new ForbiddenException('Only the exam owner can view this information');
      }
    }

    const sectionsDetails = (exam as any).sections?.map((s: any, index: number) => {
      const hasItems = Array.isArray(s?.items) && s.items.length > 0;
      const hasQuota = typeof s?.quota === 'number' && s.quota > 0;
      const isEmpty = !s || s === null || (!hasItems && !hasQuota);

      return {
        index: index + 1,
        name: s?.name || `Section ${index + 1}`,
        isNull: !s || s === null,
        hasItems,
        itemsCount: s?.items?.length || 0,
        hasQuota,
        quota: s?.quota || null,
        isEmpty,
        reason: isEmpty 
          ? (!s || s === null 
              ? 'Section is null' 
              : 'No items and no quota')
          : 'Valid section',
        raw: s,
      };
    }) || [];

    return {
      examId: (exam as any)._id?.toString() || String((exam as any)._id),
      title: exam.title,
      ownerId: (exam as any).ownerId?.toString() || String((exam as any).ownerId),
      sectionsCount: (exam as any).sections?.length || 0,
      sections: sectionsDetails,
      hasEmptySections: sectionsDetails.some((s: any) => s.isEmpty),
      emptySectionsCount: sectionsDetails.filter((s: any) => s.isEmpty).length,
    };
  }

  /**
   * إصلاح جميع الامتحانات التي sections فارغة
   * - للاستخدام من قبل admin فقط
   */
  async fixAllExamsWithEmptySections(user: ReqUser) {
    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('Only admin can fix exams');
    }

    const allExams = await this.model.find({}).exec();
    const results: Array<{ examId: string; title: string; status: string }> = [];

    for (const exam of allExams) {
      let hasEmptySections = false;
      const updatedSections = exam.sections.map((s: any, index: number) => {
        if (!s || s === null) {
          hasEmptySections = true;
          return {
            name: `Section ${index + 1}`,
            quota: 5,
            tags: [],
          };
        }

        const hasItems = Array.isArray(s.items) && s.items.length > 0;
        const hasQuota = typeof s.quota === 'number' && s.quota > 0;

        if (!hasItems && !hasQuota) {
          hasEmptySections = true;
          return {
            ...s,
            quota: 5,
          };
        }

        return s;
      });

      if (hasEmptySections) {
        exam.set('sections', updatedSections);
        exam.markModified('sections');
        await exam.save();

        results.push({
          examId: exam._id?.toString() || String(exam._id),
          title: exam.title,
          status: 'fixed',
        });
      }
    }

    return {
      success: true,
      message: `Fixed ${results.length} exam(s) with empty sections`,
      fixedExams: results,
      totalFixed: results.length,
    };
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
