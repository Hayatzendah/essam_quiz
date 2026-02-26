import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Inject,
  forwardRef,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Attempt, AttemptDocument, AttemptStatus, AttemptItem } from './schemas/attempt.schema';
import { Exam, ExamDocument } from '../exams/schemas/exam.schema';
import { Question, QuestionDocument, QuestionType, QuestionStatus } from '../questions/schemas/question.schema';
import { ExamsService } from '../exams/exams.service';
import { MediaService } from '../modules/media/media.service';
import { CreatePracticeExamDto } from '../exams/dto/create-exam.dto';
import { StartLebenExamDto } from '../exams/dto/start-leben-exam.dto';
import { normalizeAnswer } from '../common/utils/normalize.util';
import { ListeningClipsService } from '../listening-clips/listening-clips.service';
import { SchreibenTask, SchreibenTaskDocument } from '../modules/schreiben/schemas/schreiben-task.schema';
import { FormFieldType } from '../modules/schreiben/schemas/schreiben-content-block.schema';
import * as crypto from 'crypto';

type ReqUser = { userId: string; role: 'student' | 'teacher' | 'admin' };

@Injectable()
export class AttemptsService {
  private readonly logger = new Logger(AttemptsService.name);

  constructor(
    @InjectModel(Attempt.name) private readonly attemptModel: Model<AttemptDocument>,
    @InjectModel(Exam.name) private readonly examModel: Model<ExamDocument>,
    @InjectModel(Question.name) private readonly questionModel: Model<QuestionDocument>,
    @InjectModel(SchreibenTask.name) private readonly schreibenTaskModel: Model<SchreibenTaskDocument>,
    @Inject(forwardRef(() => ExamsService))
    private readonly examsService: ExamsService,
    private readonly mediaService: MediaService,
    private readonly listeningClipsService: ListeningClipsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * تحديد اتجاه النص بناءً على محتوى السؤال
   * إذا كان السؤال باللغة الألمانية، يرجع 'ltr'، وإلا 'rtl'
   */
  private detectTextDirection(text: string | undefined | null): 'ltr' | 'rtl' {
    if (!text) return 'rtl'; // افتراضي للعربية
    
    // أحرف ألمانية مميزة
    const germanChars = /[äöüßÄÖÜ]/;
    // كلمات ألمانية شائعة
    const germanWords = /\b(der|die|das|und|ist|sind|für|mit|auf|in|zu|von|an|bei|nach|über|unter|durch|gegen|ohne|um|vor|hinter|neben|zwischen|Deutschland|Bundesrepublik|Bundestag|Bundesrat|Bundeskanzler|Bundespräsident|Grundgesetz|Verfassung|Demokratie|Republik|Bundesland|Staat|Regierung|Parlament|Wahl|Partei|Minister|Abgeordnete|Bürger|Einwohner|Recht|Gesetz|Verfassung|Grundrecht|Meinungsfreiheit|Religionsfreiheit|Pressefreiheit|Versammlungsfreiheit|Wahlrecht|Sozialversicherung|Krankenversicherung|Rentenversicherung|Arbeitslosenversicherung|Pflegeversicherung|Bundeswehr|Polizei|Gericht|Richter|Staatsanwalt|Rechtsanwalt|Schöffe|Prozess|Urteil|Strafe|Geldstrafe|Freiheitsstrafe|Haft|Gefängnis|Justiz|Rechtsprechung|Gesetzgebung|Exekutive|Legislative|Judikative|Opposition|Koalition|Fraktion|Bundesversammlung|Bundesverfassungsgericht|Bundesgerichtshof|Oberlandesgericht|Amtsgericht|Verwaltungsgericht|Arbeitsgericht|Familiengericht|Strafgericht|Bundeskanzleramt|Bundespräsidialamt|Bundestagspräsident|Bundesratspräsident|Ministerpräsident|Bürgermeister|Gemeinde|Stadt|Land|Bund|Länder|Kommunen|Verwaltung|Behörde|Finanzamt|Ordnungsamt|Auswärtiges|Amt|Ministerium|Bundesministerium|Bundesland|Nordrhein-Westfalen|Bayern|Baden-Württemberg|Niedersachsen|Hessen|Sachsen|Thüringen|Brandenburg|Sachsen-Anhalt|Mecklenburg-Vorpommern|Schleswig-Holstein|Rheinland-Pfalz|Saarland|Bremen|Hamburg|Berlin)\b/i;
    
    // إذا وجد أحرف ألمانية أو كلمات ألمانية، يكون ltr
    if (germanChars.test(text) || germanWords.test(text)) {
      return 'ltr';
    }
    
    // إذا كان النص يحتوي على أحرف عربية، يكون rtl
    const arabicChars = /[\u0600-\u06FF]/;
    if (arabicChars.test(text)) {
      return 'rtl';
    }
    
    // افتراضي: ltr للنصوص اللاتينية
    return 'ltr';
  }

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
   * بدء محاولة Leben in Deutschland exam
   */
  async startLebenExam(dto: StartLebenExamDto, studentId: string) {
    this.logger.log(
      `[startLebenExam] Starting Leben exam attempt - examId: ${dto.examId}, state: ${dto.state}, studentId: ${studentId}`,
    );

    // 1. تحميل Exam
    const exam = await this.examModel.findById(dto.examId).lean().exec();
    if (!exam) {
      this.logger.error(`[startLebenExam] Exam ${dto.examId} not found`);
      throw new NotFoundException(`Exam with id "${dto.examId}" not found`);
    }

    // 2. التحقق من examCategory و examType
    if (exam.examCategory !== 'leben_exam' && exam.examType !== 'leben_test') {
      this.logger.error(
        `[startLebenExam] Exam ${dto.examId} is not a Leben exam - examCategory: ${exam.examCategory}, examType: ${exam.examType}`,
      );
      throw new BadRequestException('This endpoint is only for Leben in Deutschland exams');
    }

    if (exam.status !== 'published') {
      this.logger.error(`[startLebenExam] Exam ${dto.examId} is not published - status: ${exam.status}`);
      throw new ForbiddenException('Exam is not published');
    }

    // 3. التحقق من attemptLimit
    const existingAttempts = await this.attemptModel
      .countDocuments({
        examId: new Types.ObjectId(dto.examId),
        studentId: new Types.ObjectId(studentId),
      })
      .exec();

    if (exam.attemptLimit && exam.attemptLimit > 0 && existingAttempts >= exam.attemptLimit) {
      throw new ForbiddenException('Attempt limit reached');
    }

    const attemptCount = existingAttempts + 1;

    // 4. جلب 30 سؤال common
    const commonQuestions = await this.questionModel
      .aggregate([
        {
          $match: {
            provider: exam.provider || 'leben_in_deutschland',
            mainSkill: (exam as any).mainSkill || 'leben_test',
            usageCategory: 'common',
            status: QuestionStatus.PUBLISHED,
          },
        },
        { $sample: { size: 30 } },
      ])
      .exec();

    if (commonQuestions.length < 30) {
      this.logger.warn(
        `[startLebenExam] Only found ${commonQuestions.length} common questions, expected 30`,
      );
    }

    // 5. جلب 3 أسئلة state_specific
    const stateQuestions = await this.questionModel
      .aggregate([
        {
          $match: {
            provider: exam.provider || 'leben_in_deutschland',
            mainSkill: (exam as any).mainSkill || 'leben_test',
            usageCategory: 'state_specific',
            state: dto.state,
            status: QuestionStatus.PUBLISHED,
          },
        },
        { $sample: { size: 3 } },
      ])
      .exec();

    if (stateQuestions.length < 3) {
      this.logger.warn(
        `[startLebenExam] Only found ${stateQuestions.length} state-specific questions for ${dto.state}, expected 3`,
      );
    }

    // 6. دمج الأسئلة
    const allQuestions = [...commonQuestions, ...stateQuestions];

    if (allQuestions.length === 0) {
      throw new BadRequestException(
        'No questions available for this exam. Please check that questions are published.',
      );
    }

    // 7. إنشاء items array
    const items: AttemptItem[] = allQuestions.map((q: any) => ({
      questionId: q._id,
      qType: q.qType,
      points: 1,
    } as AttemptItem));

    // 8. ترتيب عشوائي معطّل - الأسئلة تبقى بترتيبها الأصلي
    // if (exam.randomizeQuestions) {
    //   const seedString = `${dto.examId}-${studentId}-${attemptCount}`;
    //   const randomSeed = this.generateSeed(seedString);
    //   this.shuffleArray(items, randomSeed);
    // }

    // الصوت أصبح per-question - لا حاجة لربط صوت القسم
    const sectionListeningAudioIds = new Map<string, string>();

    // 9. إنشاء snapshots للأسئلة
    const itemsWithSnapshots = await Promise.all(
      items.map((item) => this.createItemSnapshot(item, sectionListeningAudioIds)),
    );

    // 10. حساب expiresAt
    const expiresAt = exam.timeLimitMin
      ? new Date(Date.now() + exam.timeLimitMin * 60 * 1000)
      : undefined;

    // 11. إنشاء Attempt
    const attempt = await this.attemptModel.create({
      examId: new Types.ObjectId(dto.examId),
      studentId: new Types.ObjectId(studentId),
      status: AttemptStatus.IN_PROGRESS,
      attemptCount,
      randomSeed: this.generateSeed(`${dto.examId}-${studentId}-${attemptCount}`),
      startedAt: new Date(),
      expiresAt,
      items: itemsWithSnapshots,
      totalMaxScore: itemsWithSnapshots.reduce((sum, item) => sum + item.points, 0),
      examVersion: exam.version || 1, // Exam Versioning: حفظ نسخة الامتحان وقت بدء المحاولة
    });

    // 12. إرجاع البيانات (بدون answer keys)
    const attemptObj = attempt.toObject();
    
    // الصوت أصبح per-question فقط - لا نبحث عن صوت على مستوى القسم
    const listeningClip: any = null;
    const sectionListeningClipId: string | null = null;

    // استرجاع الأسئلة المطابقة التي تحتاج fallback (لا تحتوي على matchPairs أو answerKeyMatch في snapshot)
    const matchQuestionsNeedingFallback = (attemptObj.items || [])
      .filter((item: any) => item.qType === QuestionType.MATCH && !item.matchPairs && !item.answerKeyMatch)
      .map((item: any) => String(item.questionId));
    
    this.logger.log(`[startLebenExam] Found ${matchQuestionsNeedingFallback.length} match questions needing fallback: ${matchQuestionsNeedingFallback.join(', ')}`);
    
    const questionsMap = new Map();
    if (matchQuestionsNeedingFallback.length > 0) {
      const questions = await this.questionModel
        .find({ _id: { $in: matchQuestionsNeedingFallback.map(id => new Types.ObjectId(id)) } })
        .lean()
        .exec();
      this.logger.log(`[startLebenExam] Retrieved ${questions.length} questions from database for fallback`);
      questions.forEach((q: any) => {
        questionsMap.set(String(q._id), q);
        if (q.answerKeyMatch && Array.isArray(q.answerKeyMatch)) {
          this.logger.log(`[startLebenExam] Question ${q._id} has ${q.answerKeyMatch.length} pairs in answerKeyMatch`);
        } else {
          this.logger.warn(`[startLebenExam] Question ${q._id} has no answerKeyMatch in database!`);
        }
      });
    }

    // بناء response items مع حذف mediaSnapshot للأسئلة التي تعتمد على صوت السكشن
    const responseItems = (attemptObj.items || []).map((item: any) => {
      const {
        answerKeyBoolean,
        fillExact,
        regexList,
        correctOptionIndexes,
        answerKeyMatch,
        answerKeyReorder,
        matchPairs,
        ...rest
      } = item;
      
      // إذا كان صوت السؤال هو نفس صوت القسم (نفس الـ ID)، نحذف صوت السؤال (لتجنب ظهور مشغلين صوت)
      // لكن نحافظ على الصوت الخاص بكل سؤال (per-question audio) إذا كان مختلفاً
      const itemMatchesSectionAudio1 = sectionListeningClipId &&
        item.listeningClipId && item.listeningClipId.toString() === sectionListeningClipId;
      if (itemMatchesSectionAudio1) {
        const { mediaSnapshot, mediaType, mediaUrl, mediaMime, ...itemWithoutMedia } = rest;
        // استخدام optionsSnapshot إذا كان موجوداً (يحتوي على optionId)، وإلا استخدام optionsText
        const options = item.optionsSnapshot && item.optionsSnapshot.length > 0
          ? item.optionsSnapshot.map((opt: any) => ({
              id: opt.optionId,
              optionId: opt.optionId,
              text: opt.text,
              isCorrect: opt.isCorrect,
            }))
          : (item.optionsText || []).map((text: string) => ({ text }));
        
        const baseItem: any = {
          id: String(item.questionId),
          prompt: item.promptSnapshot,
          qType: item.qType,
          options,
          ...(itemWithoutMedia.imagesSnapshot && { imagesSnapshot: itemWithoutMedia.imagesSnapshot }),
        };

        // إضافة matchPairs و answerKeyMatch للأسئلة من نوع match (من snapshot إذا كان موجوداً)
        if (item.qType === QuestionType.MATCH) {
          if (matchPairs && Array.isArray(matchPairs) && matchPairs.length > 0) {
            baseItem.matchPairs = matchPairs;
            // تحويل matchPairs إلى answerKeyMatch للتوافق
            baseItem.answerKeyMatch = matchPairs.map((p: { left: string; right: string }) => [p.left, p.right] as [string, string]);
          } else if (answerKeyMatch && Array.isArray(answerKeyMatch) && answerKeyMatch.length > 0) {
            // fallback: إذا لم يكن matchPairs في snapshot، نحوله من answerKeyMatch
            baseItem.answerKeyMatch = answerKeyMatch;
            baseItem.matchPairs = answerKeyMatch.map(([left, right]: [string, string]) => ({ left, right }));
          } else {
            // fallback 2: استرجاع answerKeyMatch من السؤال الأصلي
            const questionIdStr = String(item.questionId);
            const originalQuestion = questionsMap.get(questionIdStr);
            if (originalQuestion && originalQuestion.answerKeyMatch && Array.isArray(originalQuestion.answerKeyMatch) && originalQuestion.answerKeyMatch.length > 0) {
              baseItem.answerKeyMatch = originalQuestion.answerKeyMatch;
              baseItem.matchPairs = originalQuestion.answerKeyMatch.map(([left, right]: [string, string]) => ({ left, right }));
              this.logger.log(`[startLebenExam] Match question ${item.questionId}: Retrieved answerKeyMatch from original question (fallback)`);
            } else {
              this.logger.warn(`[startLebenExam] Match question ${item.questionId} has no matchPairs or answerKeyMatch!`);
            }
          }
        }

        return baseItem;
      }
      
      // استخدام optionsSnapshot إذا كان موجوداً (يحتوي على optionId)، وإلا استخدام optionsText
      const options = item.optionsSnapshot && item.optionsSnapshot.length > 0
        ? item.optionsSnapshot.map((opt: any) => ({
            id: opt.optionId, // استخدام 'id' للتوافق مع الفرونت
            optionId: opt.optionId, // أيضاً نضيف optionId للتوافق
            text: opt.text,
            isCorrect: opt.isCorrect,
          }))
        : (item.optionsText || []).map((text: string) => ({ text }));
      
      const baseItem: any = {
        id: String(item.questionId),
        prompt: item.promptSnapshot,
        qType: item.qType,
        options,
        ...(rest.mediaSnapshot && { mediaSnapshot: rest.mediaSnapshot }),
        ...(rest.imagesSnapshot && { imagesSnapshot: rest.imagesSnapshot }),
      };

        // إضافة matchPairs و answerKeyMatch للأسئلة من نوع match (من snapshot إذا كان موجوداً)
        if (item.qType === QuestionType.MATCH) {
          if (matchPairs && Array.isArray(matchPairs) && matchPairs.length > 0) {
            baseItem.matchPairs = matchPairs;
            // تحويل matchPairs إلى answerKeyMatch للتوافق
            baseItem.answerKeyMatch = matchPairs.map((p: { left: string; right: string }) => [p.left, p.right] as [string, string]);
          } else if (answerKeyMatch && Array.isArray(answerKeyMatch) && answerKeyMatch.length > 0) {
            // fallback: إذا لم يكن matchPairs في snapshot، نحوله من answerKeyMatch
            baseItem.answerKeyMatch = answerKeyMatch;
            baseItem.matchPairs = answerKeyMatch.map(([left, right]: [string, string]) => ({ left, right }));
          } else {
            // fallback 2: استرجاع answerKeyMatch من السؤال الأصلي
            const questionIdStr = String(item.questionId);
            const originalQuestion = questionsMap.get(questionIdStr);
            if (originalQuestion && originalQuestion.answerKeyMatch && Array.isArray(originalQuestion.answerKeyMatch) && originalQuestion.answerKeyMatch.length > 0) {
              baseItem.answerKeyMatch = originalQuestion.answerKeyMatch;
              baseItem.matchPairs = originalQuestion.answerKeyMatch.map(([left, right]: [string, string]) => ({ left, right }));
              this.logger.log(`[startLebenExam] Match question ${item.questionId}: Retrieved answerKeyMatch from original question (fallback)`);
            } else {
              this.logger.warn(`[startLebenExam] Match question ${item.questionId} has no matchPairs, answerKeyMatch in snapshot, or answerKeyMatch in original question!`);
            }
          }
        }

      return baseItem;
    });

    const response: any = {
      attemptId: String(attempt._id),
      exam: {
        id: String(exam._id),
        title: exam.title,
        timeLimitMin: exam.timeLimitMin,
      },
      questions: responseItems,
    };
    
    // إضافة listeningClip إذا كان موجوداً
    if (listeningClip) {
      response.listeningClip = listeningClip;
    }

    return response;
  }

  /**
   * بدء محاولة على exam موجود
   */
  async startAttempt(examId: string, user: ReqUser) {
    this.logger.log(`[startAttempt] Starting attempt for examId: ${examId}, userId: ${user.userId}`);
    
    // 1. التحقق من Exam
    const exam = await this.examModel.findById(examId).lean().exec();
    if (!exam) {
      this.logger.error(`[startAttempt] Exam ${examId} not found`);
      throw new NotFoundException(`Exam with id "${examId}" not found`);
    }

    this.logger.log(`[startAttempt] Exam found - title: ${exam.title}, status: ${exam.status}, sections count: ${exam.sections?.length || 0}`);

    if (exam.status !== 'published') {
      this.logger.error(`[startAttempt] Exam ${examId} is not published - status: ${exam.status}`);
      throw new ForbiddenException('Exam is not published');
    }

    // التحقق من وجود sections (Schreiben exams don't need sections)
    const isSchreibenExam = (exam as any).mainSkill === 'schreiben' && (exam as any).schreibenTaskId;
    if (!isSchreibenExam && (!exam.sections || !Array.isArray(exam.sections) || exam.sections.length === 0)) {
      this.logger.error(`[startAttempt] Exam ${examId} has no sections - exam: ${JSON.stringify({ _id: exam._id, title: exam.title, sections: exam.sections })}`);
      throw new BadRequestException('Exam has no sections');
    }

    // Log تفصيلي عن sections (skip for Schreiben exams)
    if (!isSchreibenExam && exam.sections?.length > 0) {
      for (let i = 0; i < exam.sections.length; i++) {
        const section = exam.sections[i];
        const sectionAny = section as any;
        this.logger.log(`[startAttempt] Section ${i}: title="${sectionAny?.title || sectionAny?.name || 'Unnamed'}", items count=${sectionAny?.items?.length || 0}, quota=${sectionAny?.quota || 0}`);
        if (section?.items && Array.isArray(section.items)) {
          this.logger.log(`[startAttempt] Section ${i} items: ${section.items.map((item: any) => item?.questionId).join(', ')}`);
        }
      }
    }

    // 2. البحث عن محاولة in_progress لنفس examId (FIX: يجب أن يكون scoped بـ studentId + examId + status)
    // IMPORTANT: Always include userId in query to prevent cross-user attempt retrieval
    const existingInProgressAttempt = await this.attemptModel
      .findOne({
        examId: new Types.ObjectId(examId),
        studentId: new Types.ObjectId(user.userId), // CRITICAL: Must include userId
        status: AttemptStatus.IN_PROGRESS,
      })
      .lean()
      .exec();

    if (existingInProgressAttempt) {
      // Defensive check: Verify the attempt still belongs to this user and is IN_PROGRESS
      if (existingInProgressAttempt.studentId.toString() !== user.userId) {
        this.logger.error(
          `[startAttempt] SECURITY: Found attempt ${existingInProgressAttempt._id} but studentId mismatch! Expected: ${user.userId}, Found: ${existingInProgressAttempt.studentId}`,
        );
        throw new ForbiddenException('Attempt ownership mismatch detected');
      }
      if (existingInProgressAttempt.status !== AttemptStatus.IN_PROGRESS) {
        this.logger.warn(
          `[startAttempt] Found attempt ${existingInProgressAttempt._id} but status is ${existingInProgressAttempt.status}, not IN_PROGRESS. Creating new attempt.`,
        );
        // Don't return this attempt, continue to create a new one
      } else if (!existingInProgressAttempt.items || existingInProgressAttempt.items.length === 0) {
        // محاولة فاضية (بدون أسئلة) - نحذفها ونعمل وحدة جديدة
        this.logger.warn(
          `[startAttempt] Found empty in_progress attempt ${existingInProgressAttempt._id}, deleting and creating new one`,
        );
        await this.attemptModel.deleteOne({ _id: existingInProgressAttempt._id });
      } else {
        this.logger.log(
          `[startAttempt] Found existing in_progress attempt ${existingInProgressAttempt._id} for examId: ${examId}, userId: ${user.userId}, returning it`,
        );
        // إرجاع المحاولة الموجودة بدلاً من إنشاء واحدة جديدة
        // نمرر examId للتحقق من التطابق
        return this.getAttempt(user, String(existingInProgressAttempt._id), examId);
      }
    }

    // 3. التحقق من attemptLimit (فقط للمحاولات المكتملة)
    // IMPORTANT: Always include userId in query to prevent cross-user attempt counting
    const existingAttempts = await this.attemptModel
      .countDocuments({
        examId: new Types.ObjectId(examId),
        studentId: new Types.ObjectId(user.userId), // CRITICAL: Must include userId
      })
      .exec();

    if (exam.attemptLimit && exam.attemptLimit > 0 && existingAttempts >= exam.attemptLimit) {
      throw new ForbiddenException('Attempt limit reached');
    }

    const attemptCount = existingAttempts + 1;

    // Special handling for Schreiben exams
    if (isSchreibenExam) {
      this.logger.log(`[startAttempt] Processing Schreiben exam - schreibenTaskId: ${(exam as any).schreibenTaskId}`);

      const seedString = `${examId}-${user.userId}-${attemptCount}`;
      const randomSeed = this.generateSeed(seedString);

      const expiresAt = exam.timeLimitMin
        ? new Date(Date.now() + exam.timeLimitMin * 60 * 1000)
        : undefined;

      const attempt = await this.attemptModel.create({
        examId: new Types.ObjectId(examId),
        studentId: new Types.ObjectId(user.userId),
        status: AttemptStatus.IN_PROGRESS,
        attemptCount,
        randomSeed,
        startedAt: new Date(),
        expiresAt,
        items: [], // Schreiben exams have no question items
        totalMaxScore: 0,
        examVersion: exam.version || 1,
      });

      const attemptObj = attempt.toObject() as any;
      return {
        attemptId: attemptObj._id.toString(),
        status: attemptObj.status,
        startedAt: attemptObj.startedAt,
        expiresAt: attemptObj.expiresAt,
        exam: {
          id: String(exam._id),
          title: exam.title,
          timeLimitMin: exam.timeLimitMin,
          mainSkill: 'schreiben',
          schreibenTaskId: (exam as any).schreibenTaskId?.toString() || '',
        },
        questions: [], // Schreiben exams have no questions - use schreibenTaskId to fetch task
      };
    }

    // 3. اختيار الأسئلة
    this.logger.log(`[startAttempt] Calling selectQuestions for exam ${examId}`);
    const items = await this.selectQuestions(exam, attemptCount);
    this.logger.log(`[startAttempt] selectQuestions returned ${items.length} items`);

    if (items.length === 0) {
      this.logger.error(`[startAttempt] No questions available for exam ${examId} - sections: ${JSON.stringify(exam.sections.map((s: any) => ({ name: s.name, itemsCount: s.items?.length || 0, quota: s.quota || 0 })))}`);
      throw new BadRequestException('No questions available for this exam. Please check that questions are published and correctly assigned to exam sections.');
    }

    // 4. إنشاء random seed
    const seedString = `${examId}-${user.userId}-${attemptCount}`;
    const randomSeed = this.generateSeed(seedString);

    // 5. ترتيب عشوائي معطّل - الأسئلة تبقى بترتيبها الأصلي
    // if (exam.randomizeQuestions) {
    //   this.shuffleArray(items, randomSeed);
    // }

    // بناء map لصوت السكشنات عشان ما نكرر الصوت بكل سؤال
    const sectionListeningAudioIds = new Map<string, string>();
    if (exam.sections && Array.isArray(exam.sections)) {
      for (const section of exam.sections) {
        const sec = section as any;
        if (sec.listeningAudioId) {
          sectionListeningAudioIds.set(sec.key || sec.name || sec.title, sec.listeningAudioId.toString());
        }
      }
    }

    // Fallback: كشف الصوت المشترك من الأسئلة (للامتحانات القديمة بدون section.listeningAudioId)
    if (sectionListeningAudioIds.size === 0 && items.length > 0) {
      const qIdsForClips = items.map(i => i.questionId);
      const questionsForClips = await this.questionModel
        .find({ _id: { $in: qIdsForClips } })
        .select('listeningClipId')
        .lean();
      const qClipMap = new Map(questionsForClips.map((q: any) => [String(q._id), q.listeningClipId?.toString()]));

      const sectionClipCounts = new Map<string, Map<string, number>>();
      for (const item of items) {
        const clipId = qClipMap.get(String(item.questionId));
        if (!clipId || !item.sectionKey) continue;
        if (!sectionClipCounts.has(item.sectionKey)) {
          sectionClipCounts.set(item.sectionKey, new Map());
        }
        const clips = sectionClipCounts.get(item.sectionKey)!;
        clips.set(clipId, (clips.get(clipId) || 0) + 1);
      }

      for (const [sectionKey, clips] of sectionClipCounts) {
        for (const [clipId, count] of clips) {
          if (count >= 2) {
            sectionListeningAudioIds.set(sectionKey, clipId);
            this.logger.log(`[startAttempt] Fallback: detected shared audio clip ${clipId} in section "${sectionKey}" (${count} questions)`);
          }
        }
      }
    }

    // 7. إنشاء snapshots للأسئلة
    const itemsWithSnapshots = await Promise.all(
      items.map((item) => this.createItemSnapshot(item, sectionListeningAudioIds)),
    );

    // استبعاد الأسئلة الفارغة (نص "-"/"—" فقط وخيارات فارغة) — لا تدخل المحاولة أبداً
    const filteredItems = itemsWithSnapshots.filter((snapshot: any) => !this.isEmptyAttemptItem(snapshot));
    if (filteredItems.length < itemsWithSnapshots.length) {
      this.logger.log(`[startAttempt] Filtered out ${itemsWithSnapshots.length - filteredItems.length} empty/placeholder questions`);
    }

    // Log للتحقق من answerKeyMatch قبل save
    filteredItems.forEach((snapshot: any) => {
      if (snapshot.qType === QuestionType.MATCH) {
        this.logger.warn(`[startAttempt] [MATCH BEFORE SAVE] qId: ${String(snapshot.questionId)}, len: ${snapshot.answerKeyMatch?.length || 0}, hasAnswerKeyMatch: ${!!snapshot.answerKeyMatch}`);
      }
    });

    // 8. حساب expiresAt
    const expiresAt = exam.timeLimitMin
      ? new Date(Date.now() + exam.timeLimitMin * 60 * 1000)
      : undefined;

    // 8.5. البحث عن نص القراءة (LESEN section description)
    let readingText: { teil: number; content: string } | undefined;
    const lesenSection = exam.sections?.find(
      (s: any) => s.skill === 'LESEN' || s.skill === 'lesen',
    );
    if (lesenSection && lesenSection.description) {
      readingText = {
        teil: lesenSection.teilNumber || 1,
        content: lesenSection.description,
      };
      this.logger.log(`[startAttempt] Found LESEN section with description, teil: ${readingText.teil}`);
    }

    // 9. إنشاء Attempt (فقط الأسئلة غير الفارغة)
    const attempt = await this.attemptModel.create({
      examId: new Types.ObjectId(examId),
      studentId: new Types.ObjectId(user.userId),
      status: AttemptStatus.IN_PROGRESS,
      attemptCount,
      randomSeed,
      startedAt: new Date(),
      expiresAt,
      items: filteredItems,
      totalMaxScore: filteredItems.reduce((sum, item) => sum + item.points, 0),
      readingText, // 👈 نص القراءة
      examVersion: exam.version || 1, // Exam Versioning: حفظ نسخة الامتحان وقت بدء المحاولة
    });
    
    // Log للتحقق من answerKeyMatch بعد save
    const saved = await this.attemptModel.findById(attempt._id).lean().exec();
    if (saved && saved.items) {
      saved.items.forEach((item: any) => {
        if (item.qType === QuestionType.MATCH) {
          this.logger.warn(`[startAttempt] [MATCH AFTER SAVE] qId: ${String(item.questionId)}, has: ${!!item.answerKeyMatch}, len: ${item.answerKeyMatch?.length || 0}, keys: ${Object.keys(item).join(', ')}`);
        }
      });
    }

    // 10. إرجاع البيانات (بدون answer keys)
    const attemptObj = attempt.toObject();

    // ✅ FIX: إعادة ترتيب items حسب ترتيب الامتحان + تصفية المحذوفة
    if (exam.sections && Array.isArray(exam.sections) && attemptObj.items && attemptObj.items.length > 0) {
      // جلب الأسئلة المنشورة فقط
      const allSectionQIds = exam.sections
        .flatMap((s: any) => (s.items || []).map((item: any) => item.questionId))
        .filter(Boolean);
      const publishedIds = new Set<string>();
      if (allSectionQIds.length > 0) {
        const pubQuestions = await this.questionModel
          .find({ _id: { $in: allSectionQIds }, status: { $ne: 'archived' } })
          .select('_id')
          .lean();
        for (const q of pubQuestions) {
          publishedIds.add((q as any)._id.toString());
        }
      }

      const orderMap = new Map<string, number>();
      let globalOrder = 0;
      const sortedSections = [...exam.sections].sort(
        (a: any, b: any) => ((a as any).order ?? 0) - ((b as any).order ?? 0) || ((a as any).teilNumber ?? 0) - ((b as any).teilNumber ?? 0)
      );
      for (const section of sortedSections) {
        const sec = section as any;
        if (sec.items && Array.isArray(sec.items)) {
          for (const sItem of sec.items) {
            const qId = sItem.questionId?.toString();
            if (qId && publishedIds.has(qId)) {
              orderMap.set(qId, globalOrder++);
            }
          }
        }
      }
      const beforeFilter = attemptObj.items.length;
      attemptObj.items = attemptObj.items.filter((a: any) => {
        return orderMap.has(a.questionId?.toString());
      });
      if (attemptObj.items.length < beforeFilter) {
        this.logger.log(`[startAttempt] Filtered out ${beforeFilter - attemptObj.items.length} deleted/archived questions`);
      }
      if (orderMap.size > 0) {
        attemptObj.items.sort((a: any, b: any) => {
          const orderA = orderMap.get(a.questionId?.toString()) ?? 999999;
          const orderB = orderMap.get(b.questionId?.toString()) ?? 999999;
          return orderA - orderB;
        });
      }
      this.logger.log(`[startAttempt] Final items: ${attemptObj.items.length} (published: ${publishedIds.size})`);
    }

    // بناء set لصوت السكشنات عشان نشيل mediaSnapshot من الأسئلة اللي صوتها من الـ section
    const sectionAudioClipIdsForResponse = new Set<string>();
    if (exam.sections && Array.isArray(exam.sections)) {
      for (const section of exam.sections) {
        const sec = section as any;
        if (sec.listeningAudioId) {
          sectionAudioClipIdsForResponse.add(sec.listeningAudioId.toString());
        }
      }
    }
    // Fallback: إذا فارغ، نستخدم البيانات المكتشفة من الأسئلة
    if (sectionAudioClipIdsForResponse.size === 0 && sectionListeningAudioIds.size > 0) {
      for (const [, clipId] of sectionListeningAudioIds) {
        sectionAudioClipIdsForResponse.add(clipId);
      }
    }

    // بناء response items
    // جمع جميع questionIds للأسئلة Match التي لا تحتوي على matchPairs أو answerKeyMatch
    const matchQuestionsNeedingFallback: string[] = [];
    (attemptObj.items || []).forEach((item: any) => {
      if (item.qType === QuestionType.MATCH && !item.matchPairs && !item.answerKeyMatch) {
        matchQuestionsNeedingFallback.push(String(item.questionId));
      }
    });

    // استرجاع answerKeyMatch من السؤال الأصلي للأسئلة التي تحتاج fallback
    const questionsMap = new Map<string, any>();
    if (matchQuestionsNeedingFallback.length > 0) {
      const questions = await this.questionModel
        .find({ _id: { $in: matchQuestionsNeedingFallback.map(id => new Types.ObjectId(id)) } })
        .lean()
        .exec();
      questions.forEach((q: any) => {
        questionsMap.set(String(q._id), q);
      });
    }

    const responseItems = (attemptObj.items || []).map((item: any) => {
      // Log للتحقق من answerKeyMatch/matchPairs قبل destructuring
      if (item.qType === QuestionType.MATCH) {
        this.logger.warn(`[getAttempt] [MATCH BEFORE DESTRUCT] qId: ${String(item.questionId)}, hasAnswerKeyMatch: ${!!item.answerKeyMatch}, hasMatchPairs: ${!!item.matchPairs}, answerKeyMatchLen: ${item.answerKeyMatch?.length || 0}, matchPairsLen: ${item.matchPairs?.length || 0}`);
        this.logger.warn(`[getAttempt] [MATCH BEFORE DESTRUCT] item keys: ${Object.keys(item).join(', ')}`);
      }
      
      const { answerKeyBoolean, fillExact, regexList, correctOptionIndexes, answerKeyMatch, answerKeyReorder, matchPairs, mediaType: _mt2, mediaMime: _mm2, mediaUrl: _mu2, listeningClipId: _lc2, mediaSnapshot: _ms2, ...rest } = item;

      // إذا كان الصوت خاص بالسؤال (مش من section)، نرجعه
      const itemClipId2 = item.listeningClipId?.toString();
      const isAudioFromSection2 = itemClipId2 && sectionAudioClipIdsForResponse.has(itemClipId2);
      if (_ms2 && !isAudioFromSection2) {
        rest.mediaSnapshot = _ms2;
      }

      // إضافة matchPairs و answerKeyMatch للأسئلة من نوع match
      if (item.qType === QuestionType.MATCH) {
        let finalAnswerKeyMatch: [string, string][] | undefined = undefined;
        let finalMatchPairs: Array<{ left: string; right: string }> | undefined = undefined;

        if (matchPairs && Array.isArray(matchPairs) && matchPairs.length > 0) {
          finalMatchPairs = matchPairs;
          finalAnswerKeyMatch = matchPairs.map((p: { left: string; right: string }) => [p.left, p.right] as [string, string]);
        } else if (answerKeyMatch && Array.isArray(answerKeyMatch) && answerKeyMatch.length > 0) {
          finalAnswerKeyMatch = answerKeyMatch;
          finalMatchPairs = answerKeyMatch.map(([left, right]: [string, string]) => ({ left, right }));
        } else {
          const questionIdStr = String(item.questionId);
          const originalQuestion = questionsMap.get(questionIdStr);
          if (originalQuestion && originalQuestion.answerKeyMatch && Array.isArray(originalQuestion.answerKeyMatch) && originalQuestion.answerKeyMatch.length > 0) {
            finalAnswerKeyMatch = originalQuestion.answerKeyMatch;
            finalMatchPairs = originalQuestion.answerKeyMatch.map(([left, right]: [string, string]) => ({ left, right }));
          }
        }

        return {
          ...rest,
          ...(finalAnswerKeyMatch && { answerKeyMatch: finalAnswerKeyMatch }),
          ...(finalMatchPairs && { matchPairs: finalMatchPairs }),
        };
      }

      return rest;
    });

    const response: any = {
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

    // إضافة readingText إذا كان موجوداً (لقسم القراءة LESEN)
    if (attempt.readingText) {
      response.readingText = attempt.readingText;
    }

    return response;
  }

  /**
   * اختيار الأسئلة من Exam
   */
  private async selectQuestions(exam: any, attemptCount: number): Promise<AttemptItem[]> {
    const items: AttemptItem[] = [];

    if (!exam || !exam.sections || !Array.isArray(exam.sections)) {
      this.logger.warn(`[selectQuestions] Exam has no sections - examId: ${exam?._id}`);
      return items;
    }

    this.logger.log(`[selectQuestions] Processing ${exam.sections.length} sections for exam ${exam._id}`);

    for (const section of exam.sections) {
      if (!section) continue;

      if (section.items && Array.isArray(section.items) && section.items.length > 0) {
        // Fixed items-based section - process separately to maintain order
        const sectionName = section.name || 'Unnamed Section';
        this.logger.log(
          `[selectQuestions] Section "${sectionName}" is items-based with ${section.items.length} items`,
        );

        // Collect questionIds from this section
        const sectionQuestionIds: Types.ObjectId[] = [];
        const sectionItemMap = new Map<string, { points: number; originalIndex: number }>();

        for (let i = 0; i < section.items.length; i++) {
          const sectionItem = section.items[i];
          if (!sectionItem || !sectionItem.questionId) {
            this.logger.warn(
              `[selectQuestions] Skipping invalid sectionItem in section "${sectionName}": ${JSON.stringify(sectionItem)}`,
            );
            continue;
          }

          try {
            const questionId =
              sectionItem.questionId instanceof Types.ObjectId
                ? sectionItem.questionId
                : new Types.ObjectId(sectionItem.questionId);

            sectionQuestionIds.push(questionId);
            sectionItemMap.set(String(questionId), {
              points: sectionItem.points || 1,
              originalIndex: i,
            });
          } catch (error) {
            this.logger.error(
              `[selectQuestions] Invalid questionId in section "${sectionName}": ${sectionItem.questionId} - ${error}`,
            );
          }
        }

        if (sectionQuestionIds.length === 0) {
          this.logger.warn(`[selectQuestions] Section "${sectionName}" has no valid items`);
          continue;
        }

        // Fetch questions for this section (only published)
        // ✅ نبقي contentOnly في الـ attempt عشان sections التحدث اللي فيها فقط فقرات تشتغل
        // الفلترة تصير على الـ frontend (ما نعرض contentOnly كأسئلة)
        const sectionQuestions = await this.questionModel
          .find({
            _id: { $in: sectionQuestionIds },
            status: QuestionStatus.PUBLISHED,
          })
          .lean()
          .exec();

        this.logger.log(
          `[selectQuestions] Section "${sectionName}": Found ${sectionQuestions.length} published questions out of ${sectionQuestionIds.length} requested`,
        );

        if (sectionQuestions.length === 0) {
          this.logger.warn(
            `[selectQuestions] Section "${sectionName}" has no published questions for its items`,
          );
          continue;
        }

        // Create a map of questions by ID
        const questionMap = new Map(sectionQuestions.map((q: any) => [String(q._id), q]));

        // Build items array maintaining original order
        const sectionKey = section.key || section.name || `section_${exam.sections.indexOf(section)}`;
        const sectionItems: AttemptItem[] = [];
        for (const questionId of sectionQuestionIds) {
          const question = questionMap.get(String(questionId));
          if (question) {
            const itemInfo = sectionItemMap.get(String(questionId));
            sectionItems.push({
              questionId,
              qType: question.qType,
              points: itemInfo?.points || 1,
              sectionKey,
            } as AttemptItem);
          } else {
            this.logger.warn(
              `[selectQuestions] Question ${questionId} in section "${sectionName}" not found or not published`,
            );
          }
        }

        // ترتيب عشوائي معطّل - الأسئلة تبقى بترتيبها الأصلي
        // const shouldRandomize = section.randomize || exam.randomizeQuestions;
        // if (shouldRandomize && sectionItems.length > 0) {
        //   const seedString = `section-${sectionName}-${attemptCount}`;
        //   const randomSeed = this.generateSeed(seedString);
        //   this.shuffleArray(sectionItems, randomSeed);
        //   this.logger.log(`[selectQuestions] Section "${sectionName}" items randomized`);
        // }

        items.push(...sectionItems);
        this.logger.log(
          `[selectQuestions] Section "${sectionName}": Added ${sectionItems.length} items to attempt`,
        );
      } else if (section.quota !== undefined && section.quota !== null) {
        // FIX: quota = 0 يعني unlimited (لا limit)، quota > 0 يعني limit = quota
        const quota = section.quota ?? 0;
        if (quota === 0) {
          this.logger.log(`[selectQuestions] Section "${section.name}" has quota=0 (unlimited)`);
        } else {
          this.logger.log(`[selectQuestions] Section "${section.name}" has quota: ${quota}`);
        }
        // اختيار عشوائي حسب quota (0 = unlimited)
        const selectedQuestions = await this.selectRandomQuestions(
          section,
          exam.level,
          exam.provider,
          attemptCount,
          (exam as any).mainSkill, // FIX: تمرير exam.mainSkill للفلترة الصحيحة
        );
        const quotaSectionKey = section.key || section.name || `section_${exam.sections.indexOf(section)}`;
        for (const q of selectedQuestions) {
          items.push({
            questionId: q._id,
            qType: q.qType,
            points: 1,
            sectionKey: quotaSectionKey,
          } as AttemptItem);
        }
      }
    }

    // Final validation - all items have been processed per section with qType already set
    if (items.length === 0) {
      const errorMessage =
        'No questions available for this exam. Please check that questions are published and correctly assigned to exam sections.';
      this.logger.error(`[selectQuestions] ${errorMessage}`);
      throw new BadRequestException(errorMessage);
    }

    this.logger.log(
      `[selectQuestions] Returning ${items.length} total items from ${exam.sections.length} sections`,
    );
    return items;
  }

  /**
   * تحديد الأنواع المسموحة من الأسئلة حسب skill
   */
  private getAllowedQTypes(skill?: string): QuestionType[] {
    if (!skill) {
      // إذا لم يكن هناك skill، نسمح بجميع الأنواع
      return Object.values(QuestionType);
    }

    const skillLower = skill.toLowerCase();
    
    // Lesen (القراءة): يسمح بـ mcq, true_false, fill, match, reorder, interactive_text
    if (skillLower === 'lesen' || skillLower === 'reading') {
      return [
        QuestionType.MCQ,
        QuestionType.TRUE_FALSE,
        QuestionType.FILL,
        QuestionType.MATCH,
        QuestionType.REORDER,
        QuestionType.INTERACTIVE_TEXT,
      ];
    }

    // Hören (الاستماع): يسمح بـ mcq, true_false, fill, interactive_text
    if (skillLower === 'hoeren' || skillLower === 'hören' || skillLower === 'listening') {
      return [
        QuestionType.MCQ,
        QuestionType.TRUE_FALSE,
        QuestionType.FILL,
        QuestionType.INTERACTIVE_TEXT,
      ];
    }

    // Schreiben (الكتابة): يسمح بـ free_text و interactive_text
    if (skillLower === 'schreiben' || skillLower === 'writing') {
      return [QuestionType.FREE_TEXT, QuestionType.INTERACTIVE_TEXT];
    }

    // Grammar: يسمح بجميع الأنواع بما فيها interactive_text
    if (skillLower === 'grammar' || skillLower === 'grammatik') {
      return [
        QuestionType.MCQ,
        QuestionType.TRUE_FALSE,
        QuestionType.FILL,
        QuestionType.MATCH,
        QuestionType.REORDER,
        QuestionType.INTERACTIVE_TEXT,
      ];
    }

    // Sprechen (التحدث): يسمح بـ speaking فقط
    if (skillLower === 'sprechen' || skillLower === 'speaking') {
      return [QuestionType.SPEAKING];
    }

    // إذا كان skill غير معروف، نسمح بجميع الأنواع
    return Object.values(QuestionType);
  }

  /**
   * اختيار أسئلة عشوائية حسب quota
   * FIX: quota = 0 يعني unlimited (لا limit)، quota > 0 يعني limit = quota
   */
  private async selectRandomQuestions(
    section: any,
    level?: string,
    provider?: string,
    attemptCount: number = 1,
    examMainSkill?: string,
  ): Promise<any[]> {
    // FIX: quota = 0 يعني unlimited، quota > 0 يعني limit
    const quota = section.quota ?? 0;
    const limit = quota > 0 ? quota : undefined; // undefined = no limit

    // بناء query
    const query: any = { status: QuestionStatus.PUBLISHED };

    if (level) query.level = level;
    if (provider) {
      // استخدام regex للبحث case-insensitive (لأن provider قد يكون "Goethe" أو "goethe" أو "GOETHE")
      // FIX: للـ Leben in Deutschland، نتعامل مع جميع الأشكال
      const providerLower = provider.toLowerCase();
      if (providerLower.includes('leben') || providerLower.includes('deutschland') || providerLower === 'lid') {
        // للـ Leben in Deutschland: نبحث عن جميع الأشكال
        query.provider = { 
          $in: ['leben_in_deutschland', 'Deutschland-in-Leben', 'LID', 'lid', 'Leben in Deutschland']
        };
      } else {
        const escapedProvider = provider.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.provider = { $regex: `^${escapedProvider}$`, $options: 'i' };
      }
    }
    if (section.tags && section.tags.length > 0) {
      query.tags = { $in: section.tags };
    }

    // FIX: إضافة فلتر على mainSkill أو section.skill لمنع جلب أسئلة من مهارات/امتحانات أخرى
    if (section.skill) {
      const skill = (section.skill || '').toLowerCase();
      query.mainSkill = { $regex: `^${skill}$`, $options: 'i' };
      this.logger.log(`[selectRandomQuestions] Filtering by section.skill: ${skill}`);
    } else if (examMainSkill) {
      const skill = (examMainSkill || '').toLowerCase();
      query.mainSkill = { $regex: `^${skill}$`, $options: 'i' };
      this.logger.log(`[selectRandomQuestions] Filtering by exam.mainSkill: ${skill}`);
    }

    // FIX: للأسئلة الخاصة بالولايات (Leben in Deutschland)
    // إذا كان provider هو leben_in_deutschland و mainSkill هو leben_test
    // و section.tags يحتوي على اسم ولاية، نضيف فلتر على usageCategory و state
    const validStates = [
      'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg',
      'Bremen', 'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern',
      'Niedersachsen', 'Nordrhein-Westfalen', 'Rheinland-Pfalz',
      'Saarland', 'Sachsen', 'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen'
    ];
    
    // التحقق من provider (مع دعم جميع الأشكال)
    const providerLower = provider?.toLowerCase() || '';
    const isLebenProvider = 
      provider === 'leben_in_deutschland' || 
      provider === 'Deutschland-in-Leben' || 
      providerLower === 'lid' || 
      providerLower === 'deutschland-in-leben' ||
      providerLower.includes('leben') ||
      providerLower.includes('deutschland');
    
    // التحقق من mainSkill
    const isLebenTest = 
      examMainSkill === 'leben_test' || 
      section.skill === 'leben_test' ||
      (examMainSkill && examMainSkill.toLowerCase() === 'leben_test') ||
      (section.skill && section.skill.toLowerCase() === 'leben_test');
    
    if (isLebenProvider && isLebenTest) {
      // البحث عن ولاية في tags
      const stateTag = section.tags?.find((tag: string) => validStates.includes(tag));
      
      if (stateTag) {
        // هذا قسم خاص بالولاية - نضيف فلتر على usageCategory و state
        query.usageCategory = 'state_specific';
        query.state = stateTag;
        this.logger.log(`[selectRandomQuestions] Filtering state-specific questions for state: ${stateTag}, provider: ${provider}, mainSkill: ${examMainSkill || section.skill}`);
      } else if (section.tags?.includes('300-Fragen')) {
        // هذا قسم الـ 300 سؤال - نضيف فلتر على usageCategory
        query.usageCategory = 'common';
        this.logger.log(`[selectRandomQuestions] Filtering common questions (300-Fragen), provider: ${provider}, mainSkill: ${examMainSkill || section.skill}`);
      }
    }

    // إضافة فلتر على qType حسب skill
    const allowedQTypes = this.getAllowedQTypes(section.skill || examMainSkill);
    if (allowedQTypes.length > 0) {
      query.qType = { $in: allowedQTypes };
      this.logger.log(
        `[selectRandomQuestions] Filtering by allowed qTypes for skill "${section.skill || examMainSkill}": ${allowedQTypes.join(', ')}`,
      );
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
    
    // Log للتحقق من answerKeyMatch في الأسئلة المطابقة
    const matchQuestions = allQuestions.filter((q: any) => q.qType === QuestionType.MATCH);
    if (matchQuestions.length > 0) {
      this.logger.log(`[selectRandomQuestions] Found ${matchQuestions.length} match questions`);
      matchQuestions.forEach((q: any) => {
        if (!q.answerKeyMatch || !Array.isArray(q.answerKeyMatch)) {
          this.logger.warn(`[selectRandomQuestions] Match question ${q._id} has no answerKeyMatch!`);
        } else {
          this.logger.log(`[selectRandomQuestions] Match question ${q._id} has ${q.answerKeyMatch.length} pairs`);
        }
      });
    }

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
      
      // FIX: تطبيق limit إذا كان موجوداً (quota > 0)
      if (limit !== undefined && selected.length > limit) {
        this.logger.log(
          `[selectRandomQuestions] Applying limit ${limit} to ${selected.length} selected questions (difficulty distribution)`,
        );
        selected = selected.slice(0, limit);
      }
    } else {
      // اختيار عشوائي بسيط
      const seedString = `section-${section.name}-${attemptCount}`;
      const seed = this.generateSeed(seedString);
      // FIX: إذا كان limit undefined (quota = 0)، نأخذ كل الأسئلة
      const countToSelect = limit !== undefined ? limit : allQuestions.length;
      selected = this.selectRandom(allQuestions, countToSelect, seed);
    }

    this.logger.log(
      `[selectRandomQuestions] Selected ${selected.length} questions (quota=${quota}, limit=${limit !== undefined ? limit : 'unlimited'})`,
    );

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
   * تحديد mime type بناءً على extension الملف
   */
  private getMimeTypeFromUrl(url: string): string {
    if (!url) return 'audio/mpeg'; // افتراضي
    
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.endsWith('.opus')) {
      // Note: OPUS is no longer accepted for new uploads, but we keep this for legacy files
      return 'audio/opus'; // opus format (legacy support only)
    } else if (lowerUrl.endsWith('.ogg')) {
      return 'audio/ogg';
    } else if (lowerUrl.endsWith('.mp3')) {
      return 'audio/mpeg';
    } else if (lowerUrl.endsWith('.wav')) {
      return 'audio/wav';
    } else if (lowerUrl.endsWith('.m4a')) {
      return 'audio/mp4';
    } else if (lowerUrl.endsWith('.aac')) {
      return 'audio/aac';
    } else if (lowerUrl.endsWith('.webm')) {
      return 'audio/webm';
    }
    
    return 'audio/mpeg'; // افتراضي
  }

  /**
   * استخراج S3 key من رابط الصوت (للكليبات القديمة بدون audioKey)
   */
  private extractAudioKeyFromUrl(url: string): string | null {
    if (!url) return null;
    const match = url.match(/(audio\/[^?#]+)/);
    return match ? match[1] : null;
  }

  /**
   * إضافة سؤال تلقائياً للمحاولة إذا كان ينتمي للامتحان
   */
  private async autoAddQuestionToAttempt(attempt: any, questionId: string): Promise<any | null> {
    const question: any = await this.questionModel.findById(questionId).lean().exec();
    if (!question) return null;

    // التحقق من أن السؤال ينتمي لامتحان المحاولة
    const exam = await this.examModel.findById(attempt.examId).lean().exec();
    if (!exam || !exam.sections) return null;

    let foundSectionKey = '';
    let belongsToExam = false;
    for (const section of exam.sections) {
      if (section.items && Array.isArray(section.items)) {
        const found = section.items.find((si: any) => si.questionId && String(si.questionId) === questionId);
        if (found) {
          belongsToExam = true;
          foundSectionKey = section.key || section.name || '';
          break;
        }
      }
    }
    if (!belongsToExam) return null;

    // إنشاء item جديد
    const newItem: any = {
      questionId: new Types.ObjectId(questionId),
      qType: question.qType,
      points: question.points || 1,
      sectionKey: foundSectionKey,
      promptSnapshot: question.prompt || question.text,
      autoScore: 0,
    };

    if (question.correctOptionIndexes) newItem.correctOptionIndexes = question.correctOptionIndexes;
    if (question.answerKeyBoolean !== undefined) newItem.answerKeyBoolean = question.answerKeyBoolean;
    if (question.fillExact) newItem.fillExact = question.fillExact;
    if (question.regexList) newItem.regexList = question.regexList;
    if (question.answerKeyMatch) newItem.answerKeyMatch = question.answerKeyMatch;
    if (question.matchPairs) newItem.matchPairs = question.matchPairs;
    if (question.answerKeyReorder) newItem.answerKeyReorder = question.answerKeyReorder;
    if (question.interactiveText) newItem.interactiveTextSnapshot = question.interactiveText;
    if (question.interactiveBlanks) newItem.interactiveBlanksSnapshot = question.interactiveBlanks;
    if (question.interactiveReorder) newItem.interactiveReorderSnapshot = question.interactiveReorder;

    if (question.options && Array.isArray(question.options)) {
      newItem.optionsSnapshot = question.options.map((opt: any) => ({
        text: opt.text,
        isCorrect: opt.isCorrect,
      }));
      newItem.optionsText = question.options.map((opt: any) => opt.text);
      if (!newItem.correctOptionIndexes) {
        newItem.correctOptionIndexes = question.options
          .map((opt: any, idx: number) => opt.isCorrect ? idx : -1)
          .filter((idx: number) => idx !== -1);
      }
    }

    attempt.items.push(newItem);
    this.logger.log(`[autoAddQuestionToAttempt] Added question ${questionId} to attempt (section: ${foundSectionKey})`);
    return attempt.items[attempt.items.length - 1];
  }

  /**
   * إيجاد عنصر المحاولة حسب questionId - مع fallback عبر تعريف الامتحان (قسم الاستماع وغيره)
   * يحل مشكلة أن الفرونت قد يرسل questionId من تعريف القسم وليس من عناصر المحاولة
   */
  private async findAttemptItemByQuestionId(
    attempt: any,
    questionId: string,
  ): Promise<{ item: any; itemIdx: number } | null> {
    const qId = (questionId || '').trim();
    if (!qId) return null;

    // 1) بحث مباشر في attempt.items
    const directIdx = attempt.items.findIndex(
      (i: any) => i.questionId && String(i.questionId) === qId,
    );
    if (directIdx !== -1) {
      return { item: attempt.items[directIdx], itemIdx: directIdx };
    }

    // 2) Fallback: البحث في أقسام الامتحان ثم مطابقة العنصر بنفس القسم ونفس الترتيب
    const exam = await this.examModel.findById(attempt.examId).lean().exec();
    if (!exam || !exam.sections || !Array.isArray(exam.sections)) return null;

    for (const section of exam.sections) {
      if (!section?.items || !Array.isArray(section.items)) continue;
      const sectionKey = section.key || section.name || '';
      const indexInSection = section.items.findIndex(
        (si: any) => si && si.questionId && String(si.questionId) === qId,
      );
      if (indexInSection === -1) continue;

      const sectionItems = (attempt.items || []).filter(
        (i: any) => (i.sectionKey || '') === sectionKey,
      );
      const itemInSection = sectionItems[indexInSection];
      if (!itemInSection) continue;

      const realIdx = attempt.items.findIndex(
        (i: any) => i === itemInSection || (i.questionId && String(i.questionId) === String(itemInSection.questionId)),
      );
      if (realIdx !== -1) {
        this.logger.log(
          `[findAttemptItemByQuestionId] Resolved questionId ${qId} via section "${sectionKey}" index ${indexInSection} -> attempt itemIdx ${realIdx}`,
        );
        return { item: attempt.items[realIdx], itemIdx: realIdx };
      }
    }
    return null;
  }

  /**
   * استبعاد الأسئلة الفارغة/الوهمية (نص "-"/"—" فقط، أو خيارات كلها "-"/"—") — لا تُضاف للمحاولة أبداً
   * يشمل امتحانات التحدث (speaking) والعناصر contentOnly الفارغة.
   */
  private isEmptyAttemptItem(snapshot: any): boolean {
    const prompt = (snapshot.promptSnapshot ?? snapshot.prompt ?? snapshot.text ?? '').toString().trim();
    const dashOnly = /^[\s\-–—ـ]+$/.test(prompt);
    const isEmptyPrompt = !prompt || prompt === '-' || prompt === '—' || dashOnly;
    const qType = (snapshot.qType || snapshot.type || '').toString().toLowerCase();
    const isSpeakingOrFreeText = qType === 'speaking' || qType === 'free_text';
    const opts = snapshot.optionsText || (snapshot.optionsSnapshot || []).map((o: any) => (o && o.text) || '') || [];
    const hasRealOption = Array.isArray(opts) && opts.some((t: any) => t != null && String(t).trim() !== '' && String(t).trim() !== '-' && String(t).trim() !== '—');
    // contentOnly فارغ أو شرطات فقط → استبعاد (امتحانات التحدث)
    if (snapshot.contentOnly && isEmptyPrompt) return true;
    if (isEmptyPrompt && isSpeakingOrFreeText) return true;
    if (isEmptyPrompt) return !hasRealOption;
    const isMcqOrHasOptions = ['mcq', 'multiple-choice', 'true_false', 'true-false', 'speaking'].includes(qType) || (Array.isArray(opts) && opts.length > 0);
    if (isMcqOrHasOptions && !hasRealOption) return true;
    // سؤال بدون نقاط وبدون خيارات حقيقية → وهمي
    const points = snapshot.points ?? 0;
    if (points === 0 && !hasRealOption) return true;
    return false;
  }

  /**
   * إنشاء snapshot للسؤال
   */
  private async createItemSnapshot(item: AttemptItem, sectionListeningAudioIds?: Map<string, string>): Promise<AttemptItem> {
    // استخدام exec() بدون lean() للحصول على _id في subdocuments
    const question = await this.questionModel.findById(item.questionId).exec();
    if (!question) {
      throw new NotFoundException(`Question ${item.questionId} not found`);
    }
    
    // تحويل إلى plain object مع الحفاظ على _id في subdocuments
    const questionObj = question.toObject();

    const snapshot: any = {
      questionId: item.questionId,
      qType: questionObj.qType,
      points: item.points,
      promptSnapshot: questionObj.prompt ?? questionObj.text ?? '',
      ...(questionObj.contentOnly && { contentOnly: true }),
    };

    // حفظ answer keys
    if (questionObj.qType === QuestionType.TRUE_FALSE) {
      // True/False: نحفظ index (0 = false, 1 = true) في correctOptionIndexes
      snapshot.answerKeyBoolean = questionObj.answerKeyBoolean; // للتوافق مع الكود القديم
      snapshot.correctOptionIndexes = questionObj.answerKeyBoolean === true ? [1] : [0];
    } else if (questionObj.qType === QuestionType.FILL) {
      snapshot.fillExact = questionObj.fillExact;
      snapshot.regexList = questionObj.regexList;
    } else if (questionObj.qType === QuestionType.MCQ) {
      snapshot.correctOptionIndexes = (questionObj.options || [])
        .map((opt: any, idx: number) => (opt.isCorrect ? idx : -1))
        .filter((idx: number) => idx >= 0);
    } else if (questionObj.qType === QuestionType.MATCH) {
      this.logger.warn(`[createItemSnapshot] 🔍 Processing MATCH question ${questionObj._id}`);
      this.logger.warn(`[createItemSnapshot] questionObj.answerKeyMatch: ${JSON.stringify(questionObj.answerKeyMatch)}`);
      this.logger.warn(`[createItemSnapshot] questionObj.answerKeyMatch type: ${typeof questionObj.answerKeyMatch}, isArray: ${Array.isArray(questionObj.answerKeyMatch)}`);
      
      // التأكد من أن answerKeyMatch موجود وصحيح
      if (questionObj.answerKeyMatch && Array.isArray(questionObj.answerKeyMatch) && questionObj.answerKeyMatch.length > 0) {
        // نسخ answerKeyMatch بشكل صريح لضمان الحفظ
        snapshot.answerKeyMatch = JSON.parse(JSON.stringify(questionObj.answerKeyMatch)) as [string, string][];
        // إضافة matchPairs للعرض في response (تحويل tuples إلى objects)
        snapshot.matchPairs = questionObj.answerKeyMatch.map(([left, right]: [string, string]) => ({
          left: String(left),
          right: String(right),
        }));
        this.logger.warn(`[createItemSnapshot] ✅ Match question ${questionObj._id}: Created ${snapshot.matchPairs.length} match pairs`);
        this.logger.warn(`[createItemSnapshot] snapshot.answerKeyMatch: ${JSON.stringify(snapshot.answerKeyMatch)}`);
        this.logger.warn(`[createItemSnapshot] snapshot.matchPairs: ${JSON.stringify(snapshot.matchPairs)}`);
      } else {
        this.logger.error(`[createItemSnapshot] ❌ Match question ${questionObj._id}: answerKeyMatch is missing or invalid! answerKeyMatch: ${JSON.stringify(questionObj.answerKeyMatch)}`);
        this.logger.error(`[createItemSnapshot] Question object keys: ${Object.keys(questionObj).join(', ')}`);
        // حتى لو لم يكن answerKeyMatch موجوداً، نضيف الحقول كـ undefined لتجنب مشاكل Schema
        snapshot.answerKeyMatch = undefined;
        snapshot.matchPairs = undefined;
      }
    } else if (questionObj.qType === QuestionType.REORDER) {
      snapshot.answerKeyReorder = questionObj.answerKeyReorder;
    } else if (questionObj.qType === QuestionType.LISTEN) {
      // أسئلة LISTEN تُصحح مثل MCQ
      snapshot.correctOptionIndexes = (questionObj.options || [])
        .map((opt: any, idx: number) => (opt.isCorrect ? idx : -1))
        .filter((idx: number) => idx >= 0);
    } else if (questionObj.qType === QuestionType.FREE_TEXT) {
      // FREE_TEXT: لا يوجد answer key (يحتاج تصحيح يدوي)
      // نحفظ sampleAnswer للمعلم فقط (لا يُرسل للطالب)
      snapshot.sampleAnswer = questionObj.sampleAnswer;
      snapshot.minWords = questionObj.minWords;
      snapshot.maxWords = questionObj.maxWords;
    } else if (questionObj.qType === QuestionType.SPEAKING) {
      // SPEAKING: لا يوجد answer key (يحتاج تصحيح يدوي)
      // نحفظ modelAnswerText للمعلم فقط (لا يُرسل للطالب)
      snapshot.modelAnswerText = questionObj.modelAnswerText;
      snapshot.minSeconds = questionObj.minSeconds;
      snapshot.maxSeconds = questionObj.maxSeconds;
    } else if (questionObj.qType === QuestionType.INTERACTIVE_TEXT) {
      // INTERACTIVE_TEXT: نحفظ snapshots للتصحيح
      if (questionObj.interactiveBlanks && Array.isArray(questionObj.interactiveBlanks)) {
        snapshot.interactiveBlanksSnapshot = questionObj.interactiveBlanks.map((blank: any) => ({
          id: blank.id,
          type: blank.type === 'select' ? 'dropdown' : blank.type, // توحيد select إلى dropdown
          correctAnswers: blank.correctAnswers,
          options: blank.options || blank.choices, // استخدام options إذا كان موجوداً، وإلا choices
          choices: blank.choices || blank.options, // للتوافق مع الكود القديم
          hint: blank.hint,
        }));
        // حفظ interactiveTextSnapshot (النص مع placeholders)
        // استخدام interactiveText إذا كان موجوداً، وإلا text
        const interactiveTextValue = questionObj.interactiveText || questionObj.text;
        snapshot.interactiveTextSnapshot = interactiveTextValue; // النص مع placeholders مثل "Guten Tag! Ich {{a}} Anna. Ich {{b}} aus {{c}} ..."
        snapshot.textSnapshot = interactiveTextValue; // للتوافق مع الكود القديم
      }
      if (questionObj.interactiveReorder) {
        snapshot.interactiveReorderSnapshot = {
          parts: questionObj.interactiveReorder.parts.map((part: any) => ({
            id: part.id,
            text: part.text,
            order: part.order,
          })),
        };
      }
    }

    // حفظ options snapshot (مع ترتيب عشوائي محتمل)
    if (questionObj.options && questionObj.options.length > 0) {
      const options = [...questionObj.options];
      // يمكن إضافة ترتيب عشوائي هنا إذا كان مطلوباً
      snapshot.optionsText = options.map((opt: any) => opt.text);
      snapshot.optionOrder = options.map((_: any, idx: number) => idx);
      // حفظ options snapshot كامل مع optionId
      // مهم: نحافظ على optionId من السؤال الأصلي
      // عند استخدام toObject()، subdocuments تحتفظ بـ _id
      snapshot.optionsSnapshot = options.map((opt: any) => {
        // استخراج _id من subdocument (يجب أن يكون موجوداً بعد toObject())
        let optionId: string | undefined;
        if (opt._id) {
          optionId = typeof opt._id === 'string' ? opt._id : String(opt._id);
        } else if (opt.id) {
          optionId = typeof opt.id === 'string' ? opt.id : String(opt.id);
        }
        
        // إذا لم يكن _id موجوداً، ننشئ واحداً جديداً (للأسئلة القديمة)
        if (!optionId) {
          this.logger.warn(`Option missing _id for question ${item.questionId}, generating new ID`);
          optionId = new Types.ObjectId().toString();
        }
        
        return {
          optionId,
          text: opt.text,
          isCorrect: opt.isCorrect || false,
        };
      });
    }

    // حفظ media snapshot
    if (question.media) {
      snapshot.mediaType = question.media.type;
      snapshot.mediaMime = question.media.mime;
      snapshot.mediaSnapshot = {
        type: question.media.type,
        key: question.media.key,
        mime: question.media.mime || '',
        ...(question.media.description && { description: question.media.description }),
      };
      const baseUrl = this.configService.get<string>('PUBLIC_BASE_URL') || this.configService.get<string>('APP_URL', 'https://api.deutsch-tests.com');
      
      // إذا كان URL موجود وصحيح (يبدأ بـ https://api.deutsch-tests.com)، نستخدمه مباشرة
      if (question.media.url && question.media.url.startsWith('https://api.deutsch-tests.com')) {
        snapshot.mediaUrl = question.media.url;
        if (snapshot.mediaSnapshot) {
          snapshot.mediaSnapshot.url = question.media.url;
        }
      } else {
        // محاولة الحصول على presigned URL
        try {
          const presignedUrl = await this.mediaService.getPresignedUrl(question.media.key, 3600);
          // إذا كان presigned URL mock، نبني واحد من الـ key
          if (presignedUrl && presignedUrl.includes('/media/mock/')) {
            const fallbackUrl = `${baseUrl}/uploads/${question.media.key}`;
            snapshot.mediaUrl = fallbackUrl;
            if (snapshot.mediaSnapshot) {
              snapshot.mediaSnapshot.url = fallbackUrl;
            }
          } else {
            snapshot.mediaUrl = presignedUrl;
            if (snapshot.mediaSnapshot) {
              snapshot.mediaSnapshot.url = presignedUrl;
            }
          }
        } catch (error) {
          this.logger.warn(`Failed to get presigned URL for ${question.media.key}: ${error}`);
          // إذا فشل presigned URL، نبني URL للـ static files من الـ key
          if (question.media.key) {
            const fallbackUrl = `${baseUrl}/uploads/${question.media.key}`;
            snapshot.mediaUrl = fallbackUrl;
            if (snapshot.mediaSnapshot) {
              snapshot.mediaSnapshot.url = fallbackUrl;
            }
          }
        }
      }
    }
    
    // حفظ images snapshot (جميع الصور)
    if (question.images && Array.isArray(question.images) && question.images.length > 0) {
      const baseUrl = this.configService.get<string>('PUBLIC_BASE_URL') || this.configService.get<string>('APP_URL', 'https://api.deutsch-tests.com');
      snapshot.imagesSnapshot = await Promise.all(
        question.images.map(async (img: any) => {
          let url = img.url;
          
          // إذا كان URL موجود وصحيح (يبدأ بـ https://api.deutsch-tests.com)، نستخدمه مباشرة
          if (url && url.startsWith('https://api.deutsch-tests.com')) {
            // URL صحيح، نستخدمه كما هو
            return {
              type: 'image',
              key: img.key,
              mime: img.mime || 'image/jpeg',
              url: url,
              ...(img.description && { description: img.description }),
            };
          }
          
          // إذا كان URL mock أو localhost، نبني واحد من الـ key
          if (url && (url.includes('/media/mock/') || url.includes('localhost:4000'))) {
            if (img.key) {
              url = `${baseUrl}/uploads/${img.key}`;
            }
          }
          
          // محاولة الحصول على presigned URL فقط إذا لم يكن هناك URL صحيح
          if (!url || url.includes('/media/mock/')) {
            try {
              if (img.key) {
                url = await this.mediaService.getPresignedUrl(img.key, 3600);
                // إذا كان presigned URL mock، نبني واحد من الـ key
                if (url && url.includes('/media/mock/')) {
                  url = `${baseUrl}/uploads/${img.key}`;
                }
              }
            } catch (error) {
              this.logger.warn(`Failed to get presigned URL for ${img.key}: ${error}`);
              // إذا فشل presigned URL، نبني URL للـ static files من الـ key
              if (img.key) {
                url = `${baseUrl}/uploads/${img.key}`;
              }
            }
          }
          
          // إذا لم يكن هناك URL بعد، نبني واحد من الـ key
          if (!url && img.key) {
            url = `${baseUrl}/uploads/${img.key}`;
          }
          
          return {
            type: 'image',
            key: img.key,
            mime: img.mime || 'image/jpeg',
            url: url,
            ...(img.description && { description: img.description }),
          };
        })
      );
    }
    
    if (question.listeningClipId) {
      // إذا كان السؤال مربوط بكليب استماع
      const listeningClipIdString = question.listeningClipId.toString();
      
      // التحقق من أن listeningClipId يأتي من section (listeningAudioId)
      // إذا كان موجود في sectionListeningAudioIds، لا نضيف mediaSnapshot (سيتم إضافته في listeningClip)
      const isFromSection = sectionListeningAudioIds && Array.from(sectionListeningAudioIds.values()).includes(listeningClipIdString);
      
      if (isFromSection) {
        // الصوت من section - نحفظ listeningClipId فقط بدون mediaSnapshot
        snapshot.listeningClipId = question.listeningClipId;
        this.logger.log(`[createItemSnapshot] Question ${item.questionId} uses section listeningAudioId, skipping mediaSnapshot`);
      } else {
        // الصوت خاص بالسؤال - نضيف mediaSnapshot
        try {
          const clip = await this.listeningClipsService.findById(listeningClipIdString);
        if (clip && clip.audioUrl) {
            // تحديد mime type بناءً على extension الملف
            const mimeType = this.getMimeTypeFromUrl(clip.audioUrl);

            // توليد pre-signed URL (24 ساعة) بدل الرابط المباشر
            let signedUrl: string | undefined;
            const audioKey = (clip as any).audioKey || this.extractAudioKeyFromUrl(clip.audioUrl);
            if (audioKey) {
              try {
                signedUrl = await this.mediaService.getPresignedUrl(audioKey, 86400);
              } catch (e) {
                this.logger.warn(`Failed to presign audio key ${audioKey}: ${e}`);
              }
            }
            const finalUrl = signedUrl || (clip.audioUrl.startsWith('http') || clip.audioUrl.startsWith('/') ? clip.audioUrl : undefined);

          snapshot.mediaSnapshot = {
            type: 'audio',
            key: audioKey || clip.audioUrl,
              mime: mimeType,
            url: finalUrl,
          };
          snapshot.mediaType = 'audio';
            snapshot.mediaMime = mimeType;
          snapshot.mediaUrl = finalUrl;
          // حفظ listeningClipId للرجوع إليه لاحقاً
          snapshot.listeningClipId = question.listeningClipId;
        }
      } catch (error) {
          this.logger.warn(`Failed to get listening clip ${listeningClipIdString}: ${error}`);
        }
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
        (i: any) => i.questionId && i.questionId.toString() === answerData.questionId,
      );
      if (!item) {
        const resolved = await this.findAttemptItemByQuestionId(attempt, answerData.questionId);
        if (resolved) item = resolved.item;
      }
      // إذا السؤال مش موجود بالمحاولة، نضيفه تلقائياً
      if (!item) {
        item = await this.autoAddQuestionToAttempt(attempt, answerData.questionId);
      }
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
      // تحويل boolean إلى index (0 = false, 1 = true) للتوافق مع gradeTrueFalse()
      item.studentAnswerIndexes = [answerData.studentAnswerBoolean === true ? 1 : 0];
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
   * فحص إجابة سؤال واحد - يحفظ الإجابة ويصححها ويرجع النتيجة
   */
  async checkAnswer(
    user: ReqUser,
    attemptId: string,
    answerData: {
      itemIndex?: number;
      questionId?: string;
      selectedOptionIndexes?: number[];
      studentAnswerIndexes?: number[];
      studentAnswerText?: string;
      studentAnswerBoolean?: boolean;
      studentAnswerMatch?: [string, string][];
      studentAnswerReorder?: string[];
      studentAnswerAudioKey?: string;
      answerText?: string;
      fillAnswers?: string;
      textAnswer?: string;
      interactiveAnswers?: Record<string, string>;
      studentInteractiveAnswers?: Record<string, string>;
      reorderAnswer?: string[];
      studentReorderAnswer?: string[];
      userAnswer?: any;
    },
  ) {
    const attempt = await this.attemptModel.findById(attemptId).exec();
    if (!attempt) {
      throw new NotFoundException(`Attempt ${attemptId} not found`);
    }

    if (attempt.studentId.toString() !== user.userId) {
      throw new ForbiddenException('You can only modify your own attempts');
    }

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new ForbiddenException('Attempt is not in progress');
    }

    if (attempt.expiresAt && new Date() > attempt.expiresAt) {
      throw new ForbiddenException('Attempt time has expired');
    }

    // إيجاد item
    let item: any;
    let itemIdx: number = -1;
    if (answerData.questionId) {
      itemIdx = attempt.items.findIndex(
        (i: any) => i.questionId && i.questionId.toString() === answerData.questionId,
      );
      if (itemIdx !== -1) {
        item = attempt.items[itemIdx];
      } else {
        // Fallback: قسم الاستماع وغيره - إيجاد العنصر عبر تعريف الامتحان (نفس القسم ونفس الترتيب)
        const resolved = await this.findAttemptItemByQuestionId(attempt, answerData.questionId);
        if (resolved) {
          item = resolved.item;
          itemIdx = resolved.itemIdx;
        }
      }
    } else if (answerData.itemIndex !== undefined) {
      itemIdx = answerData.itemIndex;
      item = attempt.items[itemIdx];
    }

    // إذا السؤال مش موجود بالمحاولة، نضيفه تلقائياً (لو موجود بالامتحان)
    if (!item && answerData.questionId) {
      item = await this.autoAddQuestionToAttempt(attempt, answerData.questionId);
      if (item) {
        itemIdx = attempt.items.length - 1;
      }
    }

    if (!item) {
      throw new BadRequestException(
        answerData.questionId
          ? `Question ${answerData.questionId} not found in attempt`
          : `Item at index ${answerData.itemIndex} not found`,
      );
    }

    // تجميع الإجابة - دعم جميع الأشكال
    const indexes = answerData.selectedOptionIndexes || answerData.studentAnswerIndexes;
    const textAns = answerData.answerText || answerData.studentAnswerText || answerData.fillAnswers || answerData.textAnswer;
    const interactiveAns = answerData.interactiveAnswers || answerData.studentInteractiveAnswers;
    const reorderAns = answerData.reorderAnswer || answerData.studentReorderAnswer || answerData.studentAnswerReorder;

    // حفظ الإجابة حسب نوع السؤال
    if (item.qType === QuestionType.MCQ || item.qType === QuestionType.LISTEN) {
      if (answerData.userAnswer && Array.isArray(answerData.userAnswer)) {
        // دعم userAnswer من الفرونت
        if (item.qType === QuestionType.TRUE_FALSE) {
          const frontendIndex = answerData.userAnswer[0];
          item.studentAnswerIndexes = [frontendIndex === 0 ? 1 : 0];
        } else {
          item.studentAnswerIndexes = answerData.userAnswer;
        }
      } else if (indexes) {
        item.studentAnswerIndexes = indexes;
      }
    } else if (item.qType === QuestionType.TRUE_FALSE) {
      if (answerData.userAnswer !== undefined) {
        if (Array.isArray(answerData.userAnswer)) {
          const frontendIndex = answerData.userAnswer[0];
          item.studentAnswerIndexes = [frontendIndex === 0 ? 1 : 0];
          item.studentAnswerBoolean = frontendIndex === 0;
        } else if (typeof answerData.userAnswer === 'boolean') {
          item.studentAnswerIndexes = [answerData.userAnswer ? 1 : 0];
          item.studentAnswerBoolean = answerData.userAnswer;
        }
      } else if (answerData.studentAnswerBoolean !== undefined) {
        item.studentAnswerIndexes = [answerData.studentAnswerBoolean ? 1 : 0];
        item.studentAnswerBoolean = answerData.studentAnswerBoolean;
      } else if (indexes) {
        item.studentAnswerIndexes = indexes;
      }
    } else if (item.qType === QuestionType.FILL) {
      if (textAns) item.studentAnswerText = textAns;
    } else if (item.qType === QuestionType.FREE_TEXT) {
      if (textAns) item.studentAnswerText = textAns;
    } else if (item.qType === QuestionType.MATCH) {
      if (answerData.studentAnswerMatch) item.studentAnswerMatch = answerData.studentAnswerMatch;
    } else if (item.qType === QuestionType.REORDER) {
      if (answerData.studentAnswerReorder) item.studentAnswerReorder = answerData.studentAnswerReorder;
    } else if (item.qType === QuestionType.INTERACTIVE_TEXT) {
      if (interactiveAns) item.studentInteractiveAnswers = interactiveAns;
      if (reorderAns) item.studentReorderAnswer = reorderAns;
    } else if (item.qType === QuestionType.SPEAKING) {
      if (answerData.studentAnswerAudioKey) item.studentAnswerAudioKey = answerData.studentAnswerAudioKey;
    }

    // تصحيح هذا السؤال فقط
    let score = 0;
    let isCorrect = false;
    let correctAnswer: any = undefined;

    if (item.qType === QuestionType.MCQ || item.qType === QuestionType.LISTEN) {
      score = this.gradeMcq(item);
      correctAnswer = { correctOptionIndexes: item.correctOptionIndexes };
    } else if (item.qType === QuestionType.TRUE_FALSE) {
      score = this.gradeTrueFalse(item);
      correctAnswer = { correctOptionIndexes: item.correctOptionIndexes };
      if (item.answerKeyBoolean !== undefined) {
        correctAnswer.answerKeyBoolean = item.answerKeyBoolean;
      }
    } else if (item.qType === QuestionType.FILL) {
      score = this.gradeFill(item);
      correctAnswer = { fillExact: item.fillExact };
    } else if (item.qType === QuestionType.MATCH) {
      score = this.gradeMatch(item);
      correctAnswer = { answerKeyMatch: item.answerKeyMatch || item.matchPairs };
    } else if (item.qType === QuestionType.REORDER) {
      score = this.gradeReorder(item);
      correctAnswer = { answerKeyReorder: item.answerKeyReorder };
    } else if (item.qType === QuestionType.INTERACTIVE_TEXT) {
      if (item.interactiveBlanksSnapshot && Array.isArray(item.interactiveBlanksSnapshot) && item.interactiveBlanksSnapshot.length > 0) {
        score = this.gradeInteractiveBlanks(item);
        correctAnswer = { interactiveBlanks: item.interactiveBlanksSnapshot };
      } else if (item.interactiveReorderSnapshot) {
        score = this.gradeInteractiveReorder(item);
        correctAnswer = { interactiveReorder: item.interactiveReorderSnapshot };
      }
    } else if (item.qType === QuestionType.FREE_TEXT || item.qType === QuestionType.SPEAKING) {
      // لا يوجد تصحيح آلي
      score = 0;
      item.needsManualReview = true;
    }

    isCorrect = score > 0 && score >= (item.points || 1);
    item.autoScore = score;

    await attempt.save();

    return {
      questionId: item.questionId.toString(),
      qType: item.qType,
      isCorrect,
      score,
      maxPoints: item.points || 1,
      correctAnswer,
      ...(item.explanation && { explanation: item.explanation }),
    };
  }

  /**
   * نتيجة قسم واحد فقط - يصحح أسئلة القسم ويرجع الإحصائيات بدون تسليم الامتحان
   */
  async getSectionSummary(user: ReqUser, attemptId: string, sectionKey: string) {
    const attempt = await this.attemptModel.findById(attemptId).exec();
    if (!attempt) {
      throw new NotFoundException(`Attempt ${attemptId} not found`);
    }

    if (attempt.studentId.toString() !== user.userId) {
      throw new ForbiddenException('You can only view your own attempts');
    }

    // فلترة الأسئلة حسب sectionKey
    const sectionItems = attempt.items.filter(
      (item: any) => item.sectionKey === sectionKey,
    );

    if (sectionItems.length === 0) {
      throw new NotFoundException(`No questions found for section "${sectionKey}" in this attempt`);
    }

    // تصحيح كل سؤال في القسم
    let totalScore = 0;
    let totalMaxPoints = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;
    const questions: any[] = [];

    for (const item of sectionItems) {
      let score = 0;
      let hasStudentAnswer = false;
      let correctAnswer: any = undefined;

      // التحقق من وجود إجابة
      if (item.qType === QuestionType.MCQ || item.qType === QuestionType.LISTEN) {
        hasStudentAnswer = !!(item.studentAnswerIndexes && item.studentAnswerIndexes.length > 0);
        score = this.gradeMcq(item);
        correctAnswer = { correctOptionIndexes: item.correctOptionIndexes };
      } else if (item.qType === QuestionType.TRUE_FALSE) {
        hasStudentAnswer = !!(item.studentAnswerIndexes && item.studentAnswerIndexes.length > 0) || item.studentAnswerBoolean !== undefined;
        score = this.gradeTrueFalse(item);
        correctAnswer = { correctOptionIndexes: item.correctOptionIndexes };
      } else if (item.qType === QuestionType.FILL) {
        hasStudentAnswer = !!item.studentAnswerText;
        score = this.gradeFill(item);
        correctAnswer = { fillExact: item.fillExact };
      } else if (item.qType === QuestionType.MATCH) {
        hasStudentAnswer = !!(item.studentAnswerMatch && item.studentAnswerMatch.length > 0);
        score = this.gradeMatch(item);
        correctAnswer = { answerKeyMatch: item.answerKeyMatch || item.matchPairs };
      } else if (item.qType === QuestionType.REORDER) {
        hasStudentAnswer = !!(item.studentAnswerReorder && item.studentAnswerReorder.length > 0);
        score = this.gradeReorder(item);
        correctAnswer = { answerKeyReorder: item.answerKeyReorder };
      } else if (item.qType === QuestionType.INTERACTIVE_TEXT) {
        if (item.interactiveBlanksSnapshot && item.interactiveBlanksSnapshot.length > 0) {
          hasStudentAnswer = !!(item.studentInteractiveAnswers && Object.keys(item.studentInteractiveAnswers).length > 0);
          score = this.gradeInteractiveBlanks(item);
          correctAnswer = { interactiveBlanks: item.interactiveBlanksSnapshot };
        } else if (item.interactiveReorderSnapshot) {
          hasStudentAnswer = !!(item.studentReorderAnswer && item.studentReorderAnswer.length > 0);
          score = this.gradeInteractiveReorder(item);
          correctAnswer = { interactiveReorder: item.interactiveReorderSnapshot };
        }
      } else if (item.qType === QuestionType.FREE_TEXT || item.qType === QuestionType.SPEAKING) {
        hasStudentAnswer = !!item.studentAnswerText || !!item.studentAnswerAudioKey || !!item.studentRecording;
        score = 0; // تصحيح يدوي
      }

      item.autoScore = score;
      const points = item.points || 1;
      const isCorrect = score > 0 && score >= points;

      if (!hasStudentAnswer) {
        unansweredCount++;
      } else if (isCorrect) {
        correctCount++;
      } else {
        wrongCount++;
      }

      totalScore += score;
      totalMaxPoints += points;

      questions.push({
        questionId: item.questionId.toString(),
        qType: item.qType,
        prompt: item.promptSnapshot,
        hasAnswer: hasStudentAnswer,
        isCorrect: hasStudentAnswer ? isCorrect : null,
        score,
        maxPoints: points,
        correctAnswer,
        ...(item.optionsSnapshot && { options: item.optionsSnapshot }),
        ...(item.studentAnswerIndexes && { studentAnswerIndexes: item.studentAnswerIndexes }),
        ...(item.studentAnswerText && { studentAnswerText: item.studentAnswerText }),
        ...(item.studentAnswerBoolean !== undefined && { studentAnswerBoolean: item.studentAnswerBoolean }),
        ...(item.studentAnswerMatch && { studentAnswerMatch: item.studentAnswerMatch }),
        ...(item.studentAnswerReorder && { studentAnswerReorder: item.studentAnswerReorder }),
        ...(item.studentInteractiveAnswers && { studentInteractiveAnswers: item.studentInteractiveAnswers }),
        ...(item.studentReorderAnswer && { studentReorderAnswer: item.studentReorderAnswer }),
      });
    }

    // حفظ الدرجات المحدثة
    await attempt.save();

    const answeredCount = correctCount + wrongCount;
    const totalQuestions = sectionItems.length;
    const percent = totalMaxPoints > 0 ? Math.round((totalScore / totalMaxPoints) * 100) : 0;

    return {
      sectionKey,
      totalQuestions,
      answered: answeredCount,
      correct: correctCount,
      wrong: wrongCount,
      unanswered: unansweredCount,
      score: totalScore,
      maxScore: totalMaxPoints,
      percent,
      questions,
    };
  }

  /**
   * تسليم المحاولة
   */
  async submitAttempt(user: ReqUser, attemptId: string, answers?: any[]) {
    // CRITICAL: Always include userId in query to prevent cross-user attempt submission
    // Use findOne with userId filter instead of findById for extra security
    const attempt = await this.attemptModel
      .findOne({
        _id: new Types.ObjectId(attemptId),
        studentId: new Types.ObjectId(user.userId), // CRITICAL: Must include userId
      })
      .exec();
    
    if (!attempt) {
      // Don't reveal if attempt exists but belongs to another user (security)
      throw new NotFoundException(`Attempt ${attemptId} not found or you don't have permission to access it`);
    }

    // Double-check ownership (defensive programming)
    if (attempt.studentId.toString() !== user.userId) {
      this.logger.error(
        `[submitAttempt] SECURITY: Attempt ${attemptId} ownership mismatch! Expected: ${user.userId}, Found: ${attempt.studentId}`,
      );
      throw new ForbiddenException('You can only submit your own attempts');
    }

    // التحقق من الحالة
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      this.logger.warn(
        `[submitAttempt] Attempt ${attemptId} for userId ${user.userId} is already ${attempt.status}, cannot submit again`,
      );
      throw new ForbiddenException('Attempt is already submitted');
    }

    // حفظ الإجابات إذا تم إرسالها
    if (answers && Array.isArray(answers)) {
      for (const answer of answers) {
        // البحث عن السؤال للتحقق من نوعه
        const question = await this.questionModel.findById(answer.questionId).lean().exec();
        if (!question) {
          throw new NotFoundException(`Question ${answer.questionId} not found`);
        }

        // التحقق من نوع السؤال - تخطي الأسئلة غير المجاب عليها (لدعم الإرسال الجزئي)
        let hasAnswer = true;
        if (question.qType === QuestionType.FREE_TEXT) {
          if (!answer.textAnswer?.trim()) {
            hasAnswer = false;
          }
        } else if (question.qType === QuestionType.FILL) {
          if (!answer.answerText?.trim() && !answer.studentAnswerText?.trim() && !answer.fillAnswers?.trim()) {
            hasAnswer = false;
          }
        } else if (question.qType === QuestionType.SPEAKING) {
          if (!answer.studentRecording && !answer.audioAnswer?.trim()) {
            hasAnswer = false;
          }
        } else if (question.qType === QuestionType.MATCH) {
          if (!answer.studentAnswerMatch) {
            hasAnswer = false;
          } else if (!Array.isArray(answer.studentAnswerMatch) && typeof answer.studentAnswerMatch !== 'object') {
            hasAnswer = false;
          }
        } else if (question.qType === QuestionType.REORDER) {
          if (!answer.studentAnswerReorder || !Array.isArray(answer.studentAnswerReorder) || answer.studentAnswerReorder.length === 0) {
            hasAnswer = false;
          }
        } else if (question.qType === QuestionType.INTERACTIVE_TEXT) {
          if (question.interactiveBlanks && Array.isArray(question.interactiveBlanks) && question.interactiveBlanks.length > 0) {
            const interactiveAnswers = answer.interactiveAnswers || answer.studentInteractiveAnswers;
            if (!interactiveAnswers || typeof interactiveAnswers !== 'object') {
              hasAnswer = false;
            }
          } else if (question.interactiveReorder) {
            const reorderAnswer = answer.reorderAnswer || answer.studentReorderAnswer || answer.studentAnswerReorder;
            if (!reorderAnswer || !Array.isArray(reorderAnswer) || reorderAnswer.length === 0) {
              hasAnswer = false;
            }
          }
        } else if (question.qType === QuestionType.MCQ || question.qType === QuestionType.LISTEN) {
          if (!answer.selectedOptionIndexes?.length && !answer.studentAnswerIndexes?.length && !answer.userAnswer) {
            hasAnswer = false;
          }
        } else if (question.qType === QuestionType.TRUE_FALSE) {
          if (!answer.selectedOptionIndexes?.length && !answer.studentAnswerIndexes?.length && answer.studentAnswerBoolean === undefined && !answer.userAnswer) {
            hasAnswer = false;
          }
        } else {
          if (!answer.selectedOptionIndexes?.length && !answer.studentAnswerIndexes?.length && !answer.userAnswer) {
            hasAnswer = false;
          }
        }

        // تخطي الأسئلة غير المجاب عليها
        if (!hasAnswer) {
          this.logger.debug(`[submitAttempt] Skipping unanswered question ${answer.questionId} (type: ${question.qType})`);
          continue;
        }

        // البحث عن الـ item باستخدام questionId أو itemIndex
        let item: any = null;
        let itemIndex: number | undefined = undefined;
        
        if (answer.questionId) {
          // البحث باستخدام questionId
          const foundIndex = attempt.items.findIndex(
            (item: any) => item.questionId.toString() === answer.questionId
          );
          if (foundIndex !== -1) {
            item = attempt.items[foundIndex];
            itemIndex = foundIndex;
          }
        } else if (answer.itemIndex !== undefined) {
          // البحث باستخدام itemIndex (للتوافق مع الكود القديم)
          itemIndex = answer.itemIndex;
          if (itemIndex !== undefined && itemIndex >= 0 && attempt.items[itemIndex]) {
            item = attempt.items[itemIndex];
          }
        }
        
        if (item) {
          // حفظ الإجابة حسب نوع السؤال
          if (question.qType === QuestionType.FREE_TEXT) {
            // لأسئلة الكتابة: نحفظ textAnswer فقط
            item.studentAnswerText = answer.textAnswer || answer.studentAnswerText;
          } else if (question.qType === QuestionType.FILL) {
            // لأسئلة Fill blank: نحفظ answerText أو studentAnswerText أو fillAnswers (للتوافق)
            item.studentAnswerText = answer.answerText || answer.studentAnswerText || answer.fillAnswers || '';
          } else if (question.qType === QuestionType.INTERACTIVE_TEXT) {
            // لأسئلة INTERACTIVE_TEXT: نحفظ الإجابات
            // نستخدم interactiveAnswers (الشكل الجديد) أو studentInteractiveAnswers (للتوافق)
            const interactiveAnswers = answer.interactiveAnswers || answer.studentInteractiveAnswers;
            if (interactiveAnswers) {
              item.studentInteractiveAnswers = interactiveAnswers;
            }
            // نستخدم reorderAnswer (الشكل الجديد) أو studentReorderAnswer أو studentAnswerReorder (للتوافق)
            const reorderAnswer = answer.reorderAnswer || answer.studentReorderAnswer || answer.studentAnswerReorder;
            if (reorderAnswer) {
              item.studentReorderAnswer = reorderAnswer;
            }
          } else if (question.qType === QuestionType.SPEAKING) {
            // لأسئلة التحدث: نحفظ studentRecording
            if (answer.studentRecording) {
              // الشكل الجديد: object مع url و mime
              item.studentRecording = {
                url: answer.studentRecording.url, // "/uploads/audio/answer-123.webm"
                mime: answer.studentRecording.mime, // "audio/webm"
              };
              item.studentAnswerAudioUrl = answer.studentRecording.url; // للتوافق
            } else if (answer.audioAnswer) {
              // للتوافق مع الكود القديم: string فقط
              const audioUrl = answer.audioAnswer;
              item.studentRecording = {
                url: audioUrl,
                mime: 'audio/webm', // افتراضي
              };
              item.studentAnswerAudioUrl = audioUrl;
            }
            // تعيين needsManualReview = true (يحتاج تصحيح يدوي)
            item.needsManualReview = true;
            // autoScore = 0 (سيتم تعيينه في autoGrade)
          } else {
            // للأسئلة الأخرى: حفظ selectedOptionIndexes أو studentAnswerIndexes
            // التحقق من selectedOptionIndexes أولاً (الشكل الجديد)
            if (answer.selectedOptionIndexes && Array.isArray(answer.selectedOptionIndexes)) {
              // للـ True/False: عكس القيمة لأن الفرونت يستخدم 0 = صح (true), 1 = خطأ (false)
              // لكن الباك يتوقع 0 = false, 1 = true
              if (question.qType === QuestionType.TRUE_FALSE) {
                const frontendIndex = answer.selectedOptionIndexes[0];
                // عكس القيمة: 0 → 1 (صح → true), 1 → 0 (خطأ → false)
                item.studentAnswerIndexes = [frontendIndex === 0 ? 1 : 0];
                // حفظ أيضاً كـ boolean للتوافق
                item.studentAnswerBoolean = frontendIndex === 0;
              } else {
                // للـ MCQ: استخدام indexes مباشرة
              item.studentAnswerIndexes = answer.selectedOptionIndexes;
              }
            } else if (answer.studentAnswerIndexes !== undefined && Array.isArray(answer.studentAnswerIndexes)) {
              // للـ True/False: عكس القيمة إذا كان من الفرونت
              if (question.qType === QuestionType.TRUE_FALSE) {
                const frontendIndex = answer.studentAnswerIndexes[0];
                // عكس القيمة: 0 → 1 (صح → true), 1 → 0 (خطأ → false)
                item.studentAnswerIndexes = [frontendIndex === 0 ? 1 : 0];
                // حفظ أيضاً كـ boolean للتوافق
                item.studentAnswerBoolean = frontendIndex === 0;
              } else {
              item.studentAnswerIndexes = answer.studentAnswerIndexes;
              }
          } else if (answer.userAnswer !== undefined) {
            // للتوافق مع الكود القديم
            if (Array.isArray(answer.userAnswer)) {
              // للـ True/False: عكس القيمة إذا كان من الفرونت
              if (question.qType === QuestionType.TRUE_FALSE) {
                const frontendIndex = answer.userAnswer[0];
                // عكس القيمة: 0 → 1 (صح → true), 1 → 0 (خطأ → false)
                item.studentAnswerIndexes = [frontendIndex === 0 ? 1 : 0];
                // حفظ أيضاً كـ boolean للتوافق
                item.studentAnswerBoolean = frontendIndex === 0;
              } else {
              item.studentAnswerIndexes = answer.userAnswer;
              }
            } else if (typeof answer.userAnswer === 'string') {
              item.studentAnswerText = answer.userAnswer;
            } else if (typeof answer.userAnswer === 'boolean') {
              // True/False: تحويل boolean إلى index (0 = false, 1 = true)
              item.studentAnswerIndexes = [answer.userAnswer === true ? 1 : 0];
            }
          } else if (answer.studentAnswerText !== undefined) {
            item.studentAnswerText = answer.studentAnswerText;
          } else if (answer.studentAnswerBoolean !== undefined) {
            // True/False: تحويل boolean إلى index (0 = false, 1 = true)
            item.studentAnswerIndexes = [answer.studentAnswerBoolean === true ? 1 : 0];
          } else if (question.qType === QuestionType.MATCH && answer.studentAnswerMatch !== undefined) {
            // لأسئلة Match: دعم أشكال متعددة
            // استرجاع left items من answerKeyMatch أو matchPairs في item
            const leftItems: string[] = [];
            if (item.answerKeyMatch && Array.isArray(item.answerKeyMatch)) {
              leftItems.push(...item.answerKeyMatch.map(([left]: [string, string]) => left));
            } else if (item.matchPairs && Array.isArray(item.matchPairs)) {
              leftItems.push(...item.matchPairs.map((p: { left: string; right: string }) => p.left));
            }
            
            if (Array.isArray(answer.studentAnswerMatch)) {
              // التحقق من الشكل: array of tuples أو array of strings
              if (answer.studentAnswerMatch.length > 0) {
                const firstElement = answer.studentAnswerMatch[0];
                
                if (Array.isArray(firstElement) && firstElement.length === 2) {
                  // الشكل 1: Array of tuples [["left", "right"], ...] - حفظ كما هو
                  item.studentAnswerMatch = answer.studentAnswerMatch;
                  this.logger.log(`[submitAttempt] Match question ${answer.questionId}: Saved as array of tuples`);
                } else if (typeof firstElement === 'string') {
                  // الشكل 2: Array of strings (right values only) - تحويل إلى array of tuples
                  if (leftItems.length === answer.studentAnswerMatch.length) {
                    const matchPairs: [string, string][] = [];
                    for (let i = 0; i < leftItems.length; i++) {
                      matchPairs.push([leftItems[i], answer.studentAnswerMatch[i]]);
                    }
                    item.studentAnswerMatch = matchPairs;
                    this.logger.log(`[submitAttempt] Match question ${answer.questionId}: Converted array of strings to array of tuples`);
                  } else {
                    this.logger.error(`[submitAttempt] Cannot convert array of strings for match question ${answer.questionId}: leftItems length (${leftItems.length}) != studentAnswerMatch length (${answer.studentAnswerMatch.length})`);
                    throw new BadRequestException(
                      `Cannot convert studentAnswerMatch array of strings for MATCH question (questionId: ${answer.questionId}). Length mismatch.`,
                    );
                  }
                }
              } else {
                // Array فارغ
                item.studentAnswerMatch = [];
              }
            } else if (typeof answer.studentAnswerMatch === 'object' && !Array.isArray(answer.studentAnswerMatch)) {
              // الشكل 3: Object mapping {0: "value1", 1: "value2"} أو {leftValue: rightValue}
              const matchPairs: [string, string][] = [];
              const rightValues = Object.values(answer.studentAnswerMatch) as string[];
              
              if (leftItems.length === rightValues.length) {
                // Object مع indexes: {0: "value1", 1: "value2"}
                for (let i = 0; i < leftItems.length; i++) {
                  matchPairs.push([leftItems[i], rightValues[i]]);
                }
                item.studentAnswerMatch = matchPairs;
                this.logger.log(`[submitAttempt] Match question ${answer.questionId}: Converted object format to array of tuples`);
              } else {
                // Object مع left values: {leftValue: rightValue}
                for (const [key, value] of Object.entries(answer.studentAnswerMatch)) {
                  if (typeof value === 'string') {
                    matchPairs.push([key, value]);
                  }
                }
                item.studentAnswerMatch = matchPairs;
                this.logger.log(`[submitAttempt] Match question ${answer.questionId}: Converted object mapping to array of tuples`);
              }
            }
          } else if (question.qType === QuestionType.REORDER && answer.studentAnswerReorder !== undefined) {
            item.studentAnswerReorder = answer.studentAnswerReorder;
          } else if (answer.studentAnswerMatch !== undefined) {
            // للتوافق مع الكود القديم
            item.studentAnswerMatch = answer.studentAnswerMatch;
          } else if (answer.studentAnswerReorder !== undefined) {
            // للتوافق مع الكود القديم
            item.studentAnswerReorder = answer.studentAnswerReorder;
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
    
    // حساب finalScore من totalAutoScore + totalManualScore
    attempt.finalScore = (attempt.totalAutoScore || 0) + (attempt.totalManualScore || 0);
    
    // التأكد من أن totalMaxScore محسوب بشكل صحيح
    if (!attempt.totalMaxScore || attempt.totalMaxScore === 0) {
      attempt.totalMaxScore = attempt.items.reduce((sum: number, item: any) => {
        return sum + (item.points || 0);
      }, 0);
    }

    this.logger.log(
      `[submitAttempt] Attempt ${attemptId} - totalAutoScore: ${attempt.totalAutoScore}, totalManualScore: ${attempt.totalManualScore}, finalScore: ${attempt.finalScore}, totalMaxScore: ${attempt.totalMaxScore}, itemsCount: ${attempt.items.length}`,
    );

    await attempt.save();

    // إرجاع البيانات المنظمة بنفس طريقة getAttempt
    return this.getAttempt(user, attemptId);
  }

  /**
   * إعادة المحاولة - إنشاء attempt جديد لنفس الامتحان
   */
  async retryAttempt(user: ReqUser, previousAttemptId: string) {
    this.logger.log(
      `[retryAttempt] Retrying attempt - previousAttemptId: ${previousAttemptId}, userId: ${user.userId}`,
    );

    // 1. جلب المحاولة السابقة للتحقق من الصلاحيات والحصول على examId
    const previousAttempt = await this.attemptModel.findById(previousAttemptId).lean().exec();
    if (!previousAttempt) {
      throw new NotFoundException(`Attempt ${previousAttemptId} not found`);
    }

    // 2. التحقق من الصلاحيات
    if (previousAttempt.studentId.toString() !== user.userId) {
      throw new ForbiddenException('You can only retry your own attempts');
    }

    // 3. الحصول على examId من المحاولة السابقة
    const examId = previousAttempt.examId.toString();

    // 4. إنشاء محاولة جديدة لنفس الامتحان
    this.logger.log(
      `[retryAttempt] Creating new attempt for examId: ${examId}, userId: ${user.userId}`,
    );
    return this.startAttempt(examId, user);
  }

  /**
   * التصحيح الآلي
   */
  private autoGrade(attempt: AttemptDocument) {
    let totalAutoScore = 0;

    for (const item of attempt.items) {
      let score = 0;

      // التأكد من وجود نوع السؤال
      if (!item.qType) {
        this.logger.warn(`[autoGrade] Item missing qType: ${item.questionId}`);
        item.autoScore = 0;
        continue;
      }

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
      } else if (item.qType === QuestionType.LISTEN) {
        // أسئلة LISTEN تُصحح مثل MCQ
        score = this.gradeMcq(item);
      } else if (item.qType === QuestionType.FREE_TEXT) {
        // FREE_TEXT: لا يوجد تصحيح آلي
        // نحفظ الإجابة كما هي ونخلي النتيجة 0 (يحتاج تصحيح يدوي)
        score = 0;
        item.needsManualReview = true;
      } else if (item.qType === QuestionType.SPEAKING) {
        // SPEAKING: لا يوجد تصحيح آلي
        // نحفظ الإجابة كما هي ونخلي النتيجة 0 (يحتاج تصحيح يدوي)
        score = 0;
        item.needsManualReview = true;
      } else if (item.qType === QuestionType.INTERACTIVE_TEXT) {
        // INTERACTIVE_TEXT: تصحيح آلي للفراغات والترتيب
        if (item.interactiveBlanksSnapshot && Array.isArray(item.interactiveBlanksSnapshot) && item.interactiveBlanksSnapshot.length > 0) {
          score = this.gradeInteractiveBlanks(item);
        } else if (item.interactiveReorderSnapshot) {
          score = this.gradeInteractiveReorder(item);
        } else {
          score = 0;
        }
      } else {
        this.logger.warn(`[autoGrade] Unknown question type: ${item.qType} for question ${item.questionId}`);
        score = 0;
      }

      item.autoScore = score;
      totalAutoScore += score;
    }

    // تحديد إذا كان هناك أسئلة تحتاج تصحيح يدوي
    attempt.hasQuestionsNeedingManualReview = attempt.items.some(
      (item) => item.needsManualReview === true,
    );

    attempt.totalAutoScore = totalAutoScore;
    
    this.logger.log(
      `[autoGrade] Calculated totalAutoScore: ${totalAutoScore} for ${attempt.items.length} items`,
    );
  }

  /**
   * تصحيح MCQ
   */
  private gradeMcq(item: any): number {
    if (!item.correctOptionIndexes || !item.studentAnswerIndexes) return 0;

    const correct = new Set(item.correctOptionIndexes);
    const studentArray = Array.isArray(item.studentAnswerIndexes) ? item.studentAnswerIndexes : [];
    
    if (studentArray.length === 0) return 0;

    // إذا كان السؤال اختيار واحد فقط (correctOptionIndexes.length === 1)
    // يجب أن يكون الاختيار النهائي فقط هو الصحيح
    if (correct.size === 1) {
      // MCQ اختيار واحد: نأخذ آخر عنصر في studentAnswerIndexes (الاختيار النهائي)
      const finalAnswer = studentArray[studentArray.length - 1];
      const correctAnswer = Array.from(correct)[0];
      
      // فقط إذا كان الاختيار النهائي مطابق للصحيح
      return finalAnswer === correctAnswer ? item.points : 0;
    }

    // MCQ متعدد الخيارات: حساب النسبة
    const student = new Set(studentArray);
    const intersect = [...student].filter((idx) => correct.has(idx)).length;
    const fraction = intersect / correct.size;

    return Math.round(item.points * fraction * 1000) / 1000;
  }

  /**
   * تصحيح True/False
   * True/False يستخدم indexes: 0 = false, 1 = true
   */
  private gradeTrueFalse(item: any): number {
    // استخدام correctOptionIndexes (الشكل الجديد)
    if (item.correctOptionIndexes && Array.isArray(item.correctOptionIndexes) && item.correctOptionIndexes.length > 0) {
      const correctIndex = item.correctOptionIndexes[0]; // 0 أو 1
      if (item.studentAnswerIndexes && Array.isArray(item.studentAnswerIndexes) && item.studentAnswerIndexes.length > 0) {
        const studentIndex = item.studentAnswerIndexes[0]; // 0 أو 1
        return correctIndex === studentIndex ? item.points : 0;
      }
    }
    
    // للتوافق مع الكود القديم (answerKeyBoolean و studentAnswerBoolean)
    if (item.answerKeyBoolean !== undefined && item.studentAnswerBoolean !== undefined) {
      return item.answerKeyBoolean === item.studentAnswerBoolean ? item.points : 0;
    }
    
    return 0;
  }

  /**
   * تصحيح Fill
   */
  private gradeFill(item: any): number {
    if (!item.studentAnswerText) return 0;

    const normalizedStudent = normalizeAnswer(item.studentAnswerText);

    // التحقق من fillExact (يمكن أن يكون string أو array)
    if (item.fillExact) {
      if (Array.isArray(item.fillExact)) {
        // إذا كان array، نتحقق من أي قيمة في array
        for (const exactValue of item.fillExact) {
          const normalizedExact = normalizeAnswer(exactValue);
    if (normalizedExact && normalizedStudent === normalizedExact) {
      return item.points;
          }
        }
      } else {
        // إذا كان string
        const normalizedExact = normalizeAnswer(item.fillExact);
        if (normalizedExact && normalizedStudent === normalizedExact) {
          return item.points;
        }
      }
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
   * يدعم أشكال متعددة لـ studentAnswerMatch:
   * 1. Array of tuples: [["left", "right"], ...]
   * 2. Array of strings (right values only): ["value1", "value2", ...] - يتم مطابقتها مع left items بالترتيب
   * 3. Object mapping: {leftIndex: rightValue} أو {leftValue: rightValue}
   */
  private gradeMatch(item: any): number {
    // الحصول على الإجابات الصحيحة من answerKeyMatch أو matchPairs
    let correctPairs: [string, string][] = [];
    if (item.answerKeyMatch && Array.isArray(item.answerKeyMatch) && item.answerKeyMatch.length > 0) {
      correctPairs = item.answerKeyMatch;
    } else if (item.matchPairs && Array.isArray(item.matchPairs) && item.matchPairs.length > 0) {
      correctPairs = item.matchPairs.map((p: { left: string; right: string }) => [p.left, p.right] as [string, string]);
    } else {
      this.logger.warn(`[gradeMatch] No answerKeyMatch or matchPairs found for question ${item.questionId}`);
      return 0;
    }

    if (!item.studentAnswerMatch) {
      return 0;
    }

    // بناء correctMap: left → right (مع normalization)
    const correctMap = new Map<string, string>();
    for (const [left, right] of correctPairs) {
      const normalizedLeft = normalizeAnswer(left);
      const normalizedRight = normalizeAnswer(right);
      correctMap.set(normalizedLeft, normalizedRight);
    }

    // بناء studentMap من studentAnswerMatch
    const studentMap = new Map<string, string>();
    
    if (Array.isArray(item.studentAnswerMatch)) {
      // التحقق من الشكل: array of tuples أو array of strings
      if (item.studentAnswerMatch.length > 0) {
        const firstElement = item.studentAnswerMatch[0];
        
        if (Array.isArray(firstElement) && firstElement.length === 2) {
          // الشكل 1: Array of tuples [["left", "right"], ...]
          for (const pair of item.studentAnswerMatch) {
            if (Array.isArray(pair) && pair.length === 2) {
              const normalizedLeft = normalizeAnswer(pair[0]);
              const normalizedRight = normalizeAnswer(pair[1]);
              studentMap.set(normalizedLeft, normalizedRight);
            }
          }
        } else if (typeof firstElement === 'string') {
          // الشكل 2: Array of strings (right values only) - يتم مطابقتها مع left items بالترتيب
          const leftItems = correctPairs.map(([left]: [string, string]) => left);
          if (item.studentAnswerMatch.length === leftItems.length) {
            for (let i = 0; i < leftItems.length; i++) {
              const normalizedLeft = normalizeAnswer(leftItems[i]);
              const normalizedRight = normalizeAnswer(item.studentAnswerMatch[i]);
              studentMap.set(normalizedLeft, normalizedRight);
            }
          } else {
            this.logger.warn(`[gradeMatch] Mismatch: studentAnswerMatch length (${item.studentAnswerMatch.length}) != correctPairs length (${leftItems.length})`);
          }
        }
      }
    } else if (typeof item.studentAnswerMatch === 'object' && !Array.isArray(item.studentAnswerMatch)) {
      // الشكل 3: Object mapping {leftIndex: rightValue} أو {leftValue: rightValue}
      const leftItems = correctPairs.map(([left]: [string, string]) => left);
      
      for (const [key, value] of Object.entries(item.studentAnswerMatch)) {
        if (typeof value === 'string') {
          // محاولة تحديد إذا كان key هو index أو left value
          const keyAsIndex = parseInt(key, 10);
          if (!isNaN(keyAsIndex) && keyAsIndex >= 0 && keyAsIndex < leftItems.length) {
            // key هو index
            const normalizedLeft = normalizeAnswer(leftItems[keyAsIndex]);
            const normalizedRight = normalizeAnswer(value);
            studentMap.set(normalizedLeft, normalizedRight);
          } else {
            // key هو left value
            const normalizedLeft = normalizeAnswer(key);
            const normalizedRight = normalizeAnswer(value);
            studentMap.set(normalizedLeft, normalizedRight);
          }
        }
      }
    }

    // المقارنة: عدد الإجابات الصحيحة
    let correctCount = 0;
    for (const [left, right] of correctMap.entries()) {
      const studentRight = studentMap.get(left);
      if (studentRight && normalizeAnswer(studentRight) === normalizeAnswer(right)) {
        correctCount++;
      }
    }

    const fraction = correctPairs.length > 0 ? correctCount / correctPairs.length : 0;
    const score = Math.round(item.points * fraction * 1000) / 1000;

    this.logger.log(
      `[gradeMatch] Question ${item.questionId}: ${correctCount}/${correctPairs.length} correct, score: ${score}/${item.points}`,
    );

    return score;
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
   * تصحيح INTERACTIVE_TEXT - Fill-in-the-blanks
   */
  private gradeInteractiveBlanks(item: any): number {
    if (!item.interactiveBlanksSnapshot || !Array.isArray(item.interactiveBlanksSnapshot) || item.interactiveBlanksSnapshot.length === 0) {
      return 0;
    }

    if (!item.studentInteractiveAnswers || typeof item.studentInteractiveAnswers !== 'object') {
      return 0;
    }

    let correctCount = 0;
    const totalBlanks = item.interactiveBlanksSnapshot.length;

    for (const blank of item.interactiveBlanksSnapshot) {
      const studentAnswer = item.studentInteractiveAnswers[blank.id];
      if (!studentAnswer || typeof studentAnswer !== 'string') {
        continue; // فراغ غير مملوء = خطأ
      }

      // التحقق من الإجابة (case-insensitive)
      const normalizedStudent = normalizeAnswer(studentAnswer.trim());
      const isCorrect = blank.correctAnswers.some((correct: string) => 
        normalizeAnswer(correct.trim()) === normalizedStudent
      );

      if (isCorrect) {
        correctCount++;
      }
    }

    // حساب النسبة
    const fraction = correctCount / totalBlanks;
    return Math.round(item.points * fraction * 1000) / 1000;
  }

  /**
   * تصحيح INTERACTIVE_TEXT - Reorder
   */
  private gradeInteractiveReorder(item: any): number {
    if (!item.interactiveReorderSnapshot || !item.interactiveReorderSnapshot.parts) {
      return 0;
    }

    if (!item.studentReorderAnswer || !Array.isArray(item.studentReorderAnswer)) {
      return 0;
    }

    const correctParts = item.interactiveReorderSnapshot.parts;
    const studentParts = item.studentReorderAnswer;

    if (correctParts.length !== studentParts.length) {
      return 0;
    }

    // إنشاء map للترتيب الصحيح: partId -> order
    const correctOrderMap = new Map<string, number>();
    for (const part of correctParts) {
      correctOrderMap.set(part.id, part.order);
    }

    // التحقق من ترتيب الطالب
    let correctCount = 0;
    for (let i = 0; i < studentParts.length; i++) {
      const partId = studentParts[i];
      const expectedOrder = correctOrderMap.get(partId);
      if (expectedOrder !== undefined && expectedOrder === i + 1) {
        correctCount++;
      }
    }

    // حساب النسبة
    const fraction = correctCount / correctParts.length;
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
  async getAttempt(user: ReqUser, attemptId: string, requestedExamId?: string) {
    const attempt = await this.attemptModel.findById(attemptId).populate('examId').lean().exec();
    if (!attempt) {
      throw new NotFoundException(`Attempt ${attemptId} not found`);
    }
    
    // CRITICAL: Verify attempt ownership BEFORE any other checks
    // This prevents cross-user attempt access
    const attemptStudentId = attempt.studentId.toString();
    const requestUserId = user.userId;
    if (attemptStudentId !== requestUserId) {
      this.logger.error(
        `[getAttempt] SECURITY: Attempt ${attemptId} belongs to studentId ${attemptStudentId} but requested by userId ${requestUserId}. Role: ${user.role}`,
      );
      // Only allow if user is exam owner or admin (checked later in permissions)
      // But log this security concern
    }
    
    // Log للتحقق من answerKeyMatch/matchPairs في attempt.items من MongoDB
    if (attempt.items && Array.isArray(attempt.items)) {
      attempt.items.forEach((item: any, index: number) => {
        if (item.qType === QuestionType.MATCH) {
          this.logger.warn(`[getAttempt] [MATCH FROM DB] Item #${index + 1}, qId: ${String(item.questionId)}, hasAnswerKeyMatch: ${!!item.answerKeyMatch}, hasMatchPairs: ${!!item.matchPairs}, answerKeyMatchLen: ${item.answerKeyMatch?.length || 0}, matchPairsLen: ${item.matchPairs?.length || 0}`);
          this.logger.warn(`[getAttempt] [MATCH FROM DB] Item #${index + 1}, item keys: ${Object.keys(item).join(', ')}`);
          if (item.answerKeyMatch) {
            this.logger.warn(`[getAttempt] [MATCH FROM DB] Item #${index + 1}, answerKeyMatch: ${JSON.stringify(item.answerKeyMatch)}`);
          }
          if (item.matchPairs) {
            this.logger.warn(`[getAttempt] [MATCH FROM DB] Item #${index + 1}, matchPairs: ${JSON.stringify(item.matchPairs)}`);
          }
          if (!item.answerKeyMatch && !item.matchPairs) {
            this.logger.error(`[getAttempt] [MATCH FROM DB] ❌ Item #${index + 1}, qId: ${String(item.questionId)}: NO PAIRS IN SNAPSHOT! This question will need fallback.`);
          }
        }
      });
    }

    const exam = attempt.examId as any;
    
    // استخراج attemptExamId بشكل صحيح
    const attemptExamId = (attempt.examId as any)?._id 
      ? String((attempt.examId as any)._id)
      : String(attempt.examId);

    // FIX: التحقق من أن attempt.examId === requestedExamId (إذا كان موجوداً)
    // هذا مهم لمنع عرض أسئلة من امتحانات أخرى
    if (requestedExamId) {
      if (attemptExamId !== requestedExamId) {
        this.logger.error(
          `[getAttempt] Attempt ${attemptId} belongs to examId ${attemptExamId} but requested examId is ${requestedExamId}. Student: ${user.userId}`,
        );
        throw new ConflictException(
          `Attempt ${attemptId} belongs to a different exam. Expected examId: ${requestedExamId}, but attempt.examId is: ${attemptExamId}`,
        );
      }
    } else {
      // إذا لم يتم إرسال requestedExamId، نتحقق من أن الطالب يملك المحاولة
      // لكن نضيف log للتحذير
      this.logger.warn(
        `[getAttempt] No requestedExamId provided for attempt ${attemptId}. Attempt belongs to examId: ${attemptExamId}, Student: ${user.userId}`,
      );
    }

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

    // ✅ FIX: إعادة ترتيب attempt.items حسب ترتيب الأسئلة في الامتحان الحالي
    // + تصفية الأسئلة المحذوفة/المؤرشفة
    if (exam.sections && Array.isArray(exam.sections) && attempt.items && attempt.items.length > 0) {
      // جلب الأسئلة المنشورة فقط من section items
      const allSectionQuestionIds = exam.sections
        .flatMap((s: any) => (s.items || []).map((item: any) => item.questionId))
        .filter(Boolean);
      const publishedQuestionIds = new Set<string>();
      if (allSectionQuestionIds.length > 0) {
        const publishedQuestions = await this.questionModel
          .find({ _id: { $in: allSectionQuestionIds }, status: { $ne: 'archived' } })
          .select('_id')
          .lean();
        for (const q of publishedQuestions) {
          publishedQuestionIds.add((q as any)._id.toString());
        }
      }

      const orderMap = new Map<string, number>();
      let globalOrder = 0;
      const sortedSections = [...exam.sections].sort(
        (a: any, b: any) => ((a as any).order ?? 0) - ((b as any).order ?? 0) || ((a as any).teilNumber ?? 0) - ((b as any).teilNumber ?? 0)
      );
      for (const section of sortedSections) {
        const sec = section as any;
        if (sec.items && Array.isArray(sec.items)) {
          for (const sItem of sec.items) {
            const qId = sItem.questionId?.toString();
            // فقط الأسئلة المنشورة تدخل الخريطة
            if (qId && publishedQuestionIds.has(qId)) {
              orderMap.set(qId, globalOrder++);
            }
          }
        }
      }
      // تصفية الأسئلة المحذوفة/المؤرشفة + الترتيب
      // ⚠️ فقط إذا كانت sections تحتوي فعلاً على أسئلة (ليس لامتحانات Leben العشوائية)
      if (orderMap.size > 0) {
        const beforeFilter = (attempt as any).items.length;
        (attempt as any).items = (attempt as any).items.filter((a: any) => {
          return orderMap.has(a.questionId?.toString());
        });
        if ((attempt as any).items.length < beforeFilter) {
          this.logger.log(`[getAttempt] Filtered out ${beforeFilter - (attempt as any).items.length} deleted/archived questions from attempt items`);
        }
        (attempt as any).items.sort((a: any, b: any) => {
          const orderA = orderMap.get(a.questionId?.toString()) ?? 999999;
          const orderB = orderMap.get(b.questionId?.toString()) ?? 999999;
          return orderA - orderB;
        });
      } else {
        this.logger.log(`[getAttempt] Skipping filter/sort - no section question IDs found (random/Leben exam)`);
      }
      this.logger.log(`[getAttempt] Final items count: ${attempt.items.length} (published: ${publishedQuestionIds.size}, orderMap: ${orderMap.size})`);
    }

    // بناء set لصوت السكشنات عشان نشيل mediaSnapshot من الأسئلة اللي صوتها من الـ section
    const sectionAudioClipIds = new Set<string>();
    if (exam.sections && Array.isArray(exam.sections)) {
      for (const section of exam.sections) {
        const sec = section as any;
        if (sec.listeningAudioId) {
          sectionAudioClipIds.add(sec.listeningAudioId.toString());
        }
      }
    }
    // Fallback: كشف الصوت المشترك من attempt items (للامتحانات القديمة بدون section.listeningAudioId)
    if (sectionAudioClipIds.size === 0) {
      const sClipCounts = new Map<string, Map<string, number>>();
      for (const item of (attempt.items || [])) {
        const clipId = (item as any).listeningClipId?.toString();
        const sk = (item as any).sectionKey;
        if (!clipId || !sk) continue;
        if (!sClipCounts.has(sk)) sClipCounts.set(sk, new Map());
        const clips = sClipCounts.get(sk)!;
        clips.set(clipId, (clips.get(clipId) || 0) + 1);
      }
      for (const [, clips] of sClipCounts) {
        for (const [clipId, count] of clips) {
          if (count >= 2) sectionAudioClipIds.add(clipId);
        }
      }
    }

    // إصلاح examId - إذا كان object بعد populate، نأخذ _id
    const examIdValue = (attempt.examId as any)?._id 
      ? String((attempt.examId as any)._id)
      : String(attempt.examId);

    // حساب النسبة المئوية
    const percentage = attempt.totalMaxScore > 0
      ? Math.round(((attempt.finalScore || 0) / attempt.totalMaxScore) * 100 * 100) / 100
      : 0;

    const result: any = {
      attemptId: String(attempt._id),
      examId: examIdValue,
      status: attempt.status,
      attemptCount: attempt.attemptCount,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      finalScore: attempt.finalScore || 0,
      maxScore: attempt.totalMaxScore || 0,
      totalMaxScore: attempt.totalMaxScore || 0,
      totalAutoScore: attempt.totalAutoScore || 0,
      totalManualScore: attempt.totalManualScore || 0,
      percentage: percentage,
    };

    // إضافة بيانات Schreiben exam إذا كان الامتحان من نوع Schreiben
    if (exam.mainSkill === 'schreiben' && exam.schreibenTaskId) {
      result.mainSkill = 'schreiben';
      result.schreibenTaskId = exam.schreibenTaskId.toString();
      result.examTitle = exam.title;
      result.timeLimitMin = exam.timeLimitMin;

      // إضافة نتائج النموذج إذا تم التسليم
      if (attempt.schreibenFormResults) {
        result.schreibenFormResults = attempt.schreibenFormResults;
        result.schreibenFormScore = attempt.schreibenFormScore || 0;
        result.schreibenFormMaxScore = attempt.schreibenFormMaxScore || 0;
        result.schreibenFormAnswers = attempt.schreibenFormAnswers;

        // بناء fieldsResults مرتبة من SchreibenTask لعرضها تحت كل حقل
        try {
          const schreibenTask = await this.schreibenTaskModel
            .findById(exam.schreibenTaskId)
            .lean();
          if (schreibenTask) {
            const taskFormFields: any[] = [];
            for (const block of schreibenTask.contentBlocks || []) {
              if (block.type === 'form' && (block.data as any)?.fields) {
                for (const field of (block.data as any).fields) {
                  taskFormFields.push(field);
                }
              }
            }
            result.fieldsResults = taskFormFields.map((field: any) => {
              const fieldKey = field.id || String(field.number);
              const fieldResult = attempt.schreibenFormResults?.[fieldKey];
              return {
                fieldId: field.id,
                fieldNumber: field.number,
                label: field.label,
                fieldType: field.fieldType,
                isStudentField: field.isStudentField !== false && field.fieldType !== 'prefilled',
                studentAnswer: fieldResult?.studentAnswer || null,
                correctAnswer: fieldResult?.correctAnswer || field.value || null,
                isCorrect: fieldResult?.isCorrect || false,
                points: fieldResult?.points || 0,
                wasAnswered: !!fieldResult,
              };
            });
          }
        } catch (e) {
          // لو فشل جلب المهمة، نرجع النتائج بدون fieldsResults
        }
      }
    }

    // إضافة readingText إذا كان موجوداً (لقسم القراءة LESEN)
    if ((attempt as any).readingText) {
      result.readingText = (attempt as any).readingText;
    }

    // إضافة items حسب policy
    if (policy === 'only_scores' && isStudent) {
      // لا items للطالب
    } else if (policy === 'correct_with_scores' && isStudent) {
      // items مع scores فقط
      result.items = attempt.items.map((item: any) => {
        const totalItemScore = (item.autoScore || 0) + (item.manualScore || 0);
        // استخدام optionsSnapshot إذا كان موجوداً (يحتوي على optionId)، وإلا استخدام optionsText
        const options = item.optionsSnapshot && item.optionsSnapshot.length > 0
          ? item.optionsSnapshot.map((opt: any) => ({
              optionId: opt.optionId,
              text: opt.text,
              isCorrect: opt.isCorrect,
            }))
          : (item.optionsText || []).map((text: string) => ({ text }));
        
        const itemResult: any = {
          questionId: String(item.questionId),
          qType: item.qType,
          promptSnapshot: item.promptSnapshot,
          textDirection: this.detectTextDirection(item.promptSnapshot),
          options,
          points: item.points || 0,
          score: totalItemScore,
          maxScore: item.points || 0,
          autoScore: item.autoScore || 0,
          manualScore: item.manualScore || 0,
          isCorrect: totalItemScore >= (item.points || 0),
          ...(item.contentOnly && { contentOnly: true }),
        };

        // إضافة تفاصيل Match pairs للنتائج (يظهر كل زوج وما إذا كان صحيحاً)
        if (item.qType === QuestionType.MATCH) {
          // استرجاع matchPairs من item
          let matchPairs: Array<{ left: string; right: string }> = [];
          if (item.matchPairs && Array.isArray(item.matchPairs)) {
            matchPairs = item.matchPairs;
          } else if (item.answerKeyMatch && Array.isArray(item.answerKeyMatch)) {
            matchPairs = item.answerKeyMatch.map(([left, right]: [string, string]) => ({ left, right }));
          }
          
          if (matchPairs.length > 0) {
            itemResult.matchPairs = matchPairs;
            
            // بناء correctMap و studentMap
            let correctPairs: [string, string][] = [];
            if (item.answerKeyMatch && Array.isArray(item.answerKeyMatch)) {
              correctPairs = item.answerKeyMatch;
            } else {
              correctPairs = matchPairs.map((p: { left: string; right: string }) => [p.left, p.right] as [string, string]);
            }
            
            const correctMap = new Map<string, string>();
            for (const [left, right] of correctPairs) {
              const normalizedLeft = normalizeAnswer(left);
              const normalizedRight = normalizeAnswer(right);
              correctMap.set(normalizedLeft, normalizedRight);
            }
            
            const studentMap = new Map<string, string>();
            if (item.studentAnswerMatch) {
              if (Array.isArray(item.studentAnswerMatch)) {
                if (item.studentAnswerMatch.length > 0) {
                  const firstElement = item.studentAnswerMatch[0];
                  if (Array.isArray(firstElement) && firstElement.length === 2) {
                    for (const pair of item.studentAnswerMatch) {
                      if (Array.isArray(pair) && pair.length === 2) {
                        const normalizedLeft = normalizeAnswer(pair[0]);
                        const normalizedRight = normalizeAnswer(pair[1]);
                        studentMap.set(normalizedLeft, normalizedRight);
                      }
                    }
                  } else if (typeof firstElement === 'string') {
                    const leftItems = correctPairs.map(([left]: [string, string]) => left);
                    if (item.studentAnswerMatch.length === leftItems.length) {
                      for (let i = 0; i < leftItems.length; i++) {
                        const normalizedLeft = normalizeAnswer(leftItems[i]);
                        const normalizedRight = normalizeAnswer(item.studentAnswerMatch[i]);
                        studentMap.set(normalizedLeft, normalizedRight);
                      }
                    }
                  }
                }
              } else if (typeof item.studentAnswerMatch === 'object' && !Array.isArray(item.studentAnswerMatch)) {
                const leftItems = correctPairs.map(([left]: [string, string]) => left);
                for (const [key, value] of Object.entries(item.studentAnswerMatch)) {
                  if (typeof value === 'string') {
                    const keyAsIndex = parseInt(key, 10);
                    if (!isNaN(keyAsIndex) && keyAsIndex >= 0 && keyAsIndex < leftItems.length) {
                      const normalizedLeft = normalizeAnswer(leftItems[keyAsIndex]);
                      const normalizedRight = normalizeAnswer(value);
                      studentMap.set(normalizedLeft, normalizedRight);
                    } else {
                      const normalizedLeft = normalizeAnswer(key);
                      const normalizedRight = normalizeAnswer(value);
                      studentMap.set(normalizedLeft, normalizedRight);
                    }
                  }
                }
              }
            }
            
            // بناء matchPairsDetails
            const matchPairsDetails = matchPairs.map((pair: { left: string; right: string }) => {
              const normalizedLeft = normalizeAnswer(pair.left);
              const correctRight = correctMap.get(normalizedLeft);
              const studentRight = studentMap.get(normalizedLeft);
              const isCorrect = correctRight && studentRight && normalizeAnswer(correctRight) === normalizeAnswer(studentRight);
              
              return {
                left: pair.left,
                correctRight: correctRight || pair.right,
                studentRight: studentRight || null,
                isCorrect: !!isCorrect,
              };
            });
            
            itemResult.matchPairsDetails = matchPairsDetails;
          }
        }
        
        // إضافة interactive_text snapshots للفرونت
        if (item.qType === QuestionType.INTERACTIVE_TEXT) {
          // إضافة interactiveTextSnapshot (النص مع placeholders)
          if (item.interactiveTextSnapshot) {
            itemResult.interactiveTextSnapshot = item.interactiveTextSnapshot;
          } else if (item.textSnapshot) {
            // fallback للتوافق مع الكود القديم
            itemResult.interactiveTextSnapshot = item.textSnapshot;
          }
          
          // إضافة interactiveBlanksSnapshot (الفراغات مع type, options, hints - بدون correctAnswers للطالب)
          if (item.interactiveBlanksSnapshot && Array.isArray(item.interactiveBlanksSnapshot) && item.interactiveBlanksSnapshot.length > 0) {
            // للطالب: نرسل الفراغات بدون correctAnswers (للأمان)
            itemResult.interactiveBlanksSnapshot = item.interactiveBlanksSnapshot.map((blank: any) => ({
              id: blank.id,
              type: blank.type === 'select' ? 'dropdown' : blank.type, // توحيد select إلى dropdown
              options: blank.options || blank.choices, // استخدام options إذا كان موجوداً، وإلا choices
              hint: blank.hint,
              // لا نرسل correctAnswers للطالب
            }));
          }
          
          // إضافة interactiveReorderSnapshot إذا كان موجوداً
          if (item.interactiveReorderSnapshot) {
            itemResult.interactiveReorderSnapshot = item.interactiveReorderSnapshot;
          }
          
          // إضافة إجابات الطالب للفراغات التفاعلية
          if (item.studentInteractiveAnswers) {
            itemResult.studentInteractiveAnswers = item.studentInteractiveAnswers;
          }
          if (item.studentReorderAnswer) {
            itemResult.studentReorderAnswer = item.studentReorderAnswer;
          }
        }
        
        // إضافة mediaSnapshot إذا كان موجوداً
        if (item.mediaSnapshot) {
          itemResult.mediaSnapshot = item.mediaSnapshot;
        }
        
        // إضافة imagesSnapshot إذا كان موجوداً
        if (item.imagesSnapshot && Array.isArray(item.imagesSnapshot) && item.imagesSnapshot.length > 0) {
          itemResult.imagesSnapshot = item.imagesSnapshot;
        }
        
        return itemResult;
      });
    } else {
      // explanations_with_scores أو للمعلم/الأدمن
      // استرجاع answerKeyMatch من السؤال الأصلي للأسئلة match التي تحتاج fallback
      // نسترجِع جميع أسئلة match للتحقق من وجود answerKeyMatch في السؤال الأصلي
      const allMatchQuestionIds: string[] = [];
      (attempt.items || []).forEach((item: any) => {
        if (item.qType === QuestionType.MATCH) {
          allMatchQuestionIds.push(String(item.questionId));
          // Log للتحقق من وجود answerKeyMatch/matchPairs في snapshot
          if (!item.matchPairs && !item.answerKeyMatch) {
            this.logger.warn(`[getAttempt] Match question ${item.questionId} has no matchPairs or answerKeyMatch in snapshot - will use fallback`);
          }
        }
      });
      
      const questionsMap = new Map<string, any>();
      if (allMatchQuestionIds.length > 0) {
        const questions = await this.questionModel
          .find({ _id: { $in: allMatchQuestionIds.map(id => new Types.ObjectId(id)) } })
          .lean()
          .exec();
        questions.forEach((q: any) => {
          questionsMap.set(String(q._id), q);
          // Log للتحقق من وجود answerKeyMatch في السؤال الأصلي
          if (q.qType === QuestionType.MATCH) {
            this.logger.warn(`[getAttempt] Original question ${q._id}: hasAnswerKeyMatch: ${!!q.answerKeyMatch}, answerKeyMatchLen: ${q.answerKeyMatch?.length || 0}`);
          }
        });
        
        // Log للتحقق من الأسئلة المحذوفة
        const foundQuestionIds = new Set(questions.map((q: any) => String(q._id)));
        const deletedQuestionIds = allMatchQuestionIds.filter(id => !foundQuestionIds.has(id));
        if (deletedQuestionIds.length > 0) {
          this.logger.warn(`[getAttempt] ⚠️ Found ${deletedQuestionIds.length} deleted match questions in attempt: ${deletedQuestionIds.join(', ')}`);
          this.logger.warn(`[getAttempt] ⚠️ These questions were deleted from DB but exist in attempt snapshot. Will use snapshot data only.`);
        }
      }
      
      result.items = attempt.items.map((item: any) => {
        const totalItemScore = (item.autoScore || 0) + (item.manualScore || 0);
        // استخدام optionsSnapshot إذا كان موجوداً (يحتوي على optionId)، وإلا استخدام optionsText
        const options = item.optionsSnapshot && item.optionsSnapshot.length > 0
          ? item.optionsSnapshot.map((opt: any) => ({
              optionId: opt.optionId,
              text: opt.text,
              isCorrect: opt.isCorrect,
            }))
          : (item.optionsText || []).map((text: string) => ({ text }));
        
        const itemResult: any = {
          questionId: String(item.questionId),
          qType: item.qType,
          promptSnapshot: item.promptSnapshot,
          textDirection: this.detectTextDirection(item.promptSnapshot),
          options,
          points: item.points || 0,
          score: totalItemScore,
          maxScore: item.points || 0,
          autoScore: item.autoScore || 0,
          manualScore: item.manualScore || 0,
          ...(item.contentOnly && { contentOnly: true }),
        };

        // إضافة answer keys للمعلم/الأدمن أو إذا كان policy يسمح
        if (!isStudent || policy === 'explanations_with_scores') {
          if (item.qType === QuestionType.MCQ) {
            itemResult.correctOptionIndexes = item.correctOptionIndexes;
          } else if (item.qType === QuestionType.TRUE_FALSE) {
            // True/False: نعيد correctOptionIndexes (0 أو 1) للتوافق مع الشكل الجديد
            itemResult.correctOptionIndexes = item.correctOptionIndexes;
            // للتوافق مع الكود القديم
            if (item.answerKeyBoolean !== undefined) {
              itemResult.answerKeyBoolean = item.answerKeyBoolean;
            }
          } else if (item.qType === QuestionType.FILL) {
            itemResult.fillExact = item.fillExact;
          } else if (item.qType === QuestionType.MATCH) {
            // إضافة answerKeyMatch و matchPairs للأسئلة من نوع match
            if (item.answerKeyMatch && Array.isArray(item.answerKeyMatch) && item.answerKeyMatch.length > 0) {
              itemResult.answerKeyMatch = item.answerKeyMatch;
              itemResult.matchPairs = item.answerKeyMatch.map(([left, right]: [string, string]) => ({ left, right }));
            } else if (item.matchPairs && Array.isArray(item.matchPairs) && item.matchPairs.length > 0) {
              itemResult.matchPairs = item.matchPairs;
              itemResult.answerKeyMatch = item.matchPairs.map((p: { left: string; right: string }) => [p.left, p.right] as [string, string]);
            }
          }
        }
        
        // للطلاب: إضافة matchPairs و answerKeyMatch (لأنهم يحتاجونها للعرض)
        if (isStudent && item.qType === QuestionType.MATCH) {
          const questionIdStr = String(item.questionId);
          this.logger.warn(`[getAttempt] [STUDENT MATCH] qId: ${questionIdStr}, hasMatchPairs: ${!!item.matchPairs}, hasAnswerKeyMatch: ${!!item.answerKeyMatch}, matchPairsLen: ${item.matchPairs?.length || 0}, answerKeyMatchLen: ${item.answerKeyMatch?.length || 0}`);
          
          if (item.matchPairs && Array.isArray(item.matchPairs) && item.matchPairs.length > 0) {
            itemResult.matchPairs = item.matchPairs;
            itemResult.answerKeyMatch = item.matchPairs.map((p: { left: string; right: string }) => [p.left, p.right] as [string, string]);
            this.logger.warn(`[getAttempt] [STUDENT MATCH] ✅ qId: ${questionIdStr}: Using matchPairs from snapshot (${item.matchPairs.length} pairs)`);
          } else if (item.answerKeyMatch && Array.isArray(item.answerKeyMatch) && item.answerKeyMatch.length > 0) {
            itemResult.answerKeyMatch = item.answerKeyMatch;
            itemResult.matchPairs = item.answerKeyMatch.map(([left, right]: [string, string]) => ({ left, right }));
            this.logger.warn(`[getAttempt] [STUDENT MATCH] ✅ qId: ${questionIdStr}: Using answerKeyMatch from snapshot (${item.answerKeyMatch.length} pairs)`);
          } else {
            // fallback: استرجاع answerKeyMatch من السؤال الأصلي
            const originalQuestion = questionsMap.get(questionIdStr);
            if (originalQuestion && originalQuestion.answerKeyMatch && Array.isArray(originalQuestion.answerKeyMatch) && originalQuestion.answerKeyMatch.length > 0) {
              itemResult.answerKeyMatch = originalQuestion.answerKeyMatch;
              itemResult.matchPairs = originalQuestion.answerKeyMatch.map(([left, right]: [string, string]) => ({ left, right }));
              this.logger.warn(`[getAttempt] [STUDENT MATCH] ✅ qId: ${questionIdStr}: Retrieved answerKeyMatch from original question (fallback) - ${originalQuestion.answerKeyMatch.length} pairs`);
            } else {
              this.logger.error(`[getAttempt] [STUDENT MATCH] ❌❌❌ qId: ${questionIdStr}: NO PAIRS FOUND ANYWHERE!`);
              this.logger.error(`[getAttempt] [STUDENT MATCH] ❌ Snapshot - matchPairs: ${JSON.stringify(item.matchPairs)}, answerKeyMatch: ${JSON.stringify(item.answerKeyMatch)}`);
              this.logger.error(`[getAttempt] [STUDENT MATCH] ❌ Original question - found: ${!!originalQuestion}, hasAnswerKeyMatch: ${!!originalQuestion?.answerKeyMatch}, answerKeyMatchLen: ${originalQuestion?.answerKeyMatch?.length || 0}`);
              if (originalQuestion) {
                this.logger.error(`[getAttempt] [STUDENT MATCH] ❌ Original question keys: ${Object.keys(originalQuestion).join(', ')}`);
                this.logger.error(`[getAttempt] [STUDENT MATCH] ❌ Original question qType: ${originalQuestion.qType}`);
                this.logger.error(`[getAttempt] [STUDENT MATCH] ❌ Original question _id: ${originalQuestion._id}`);
              } else {
                // التحقق من أن السؤال محذوف
                this.logger.warn(`[getAttempt] [STUDENT MATCH] ⚠️ qId: ${questionIdStr}: Question was DELETED from DB but exists in attempt snapshot.`);
                this.logger.warn(`[getAttempt] [STUDENT MATCH] ⚠️ Snapshot data - matchPairs: ${JSON.stringify(item.matchPairs)}, answerKeyMatch: ${JSON.stringify(item.answerKeyMatch)}`);
                // إذا كان السؤال محذوفاً ولا توجد بيانات في snapshot، لا يمكننا فعل شيء
                if (!item.matchPairs && !item.answerKeyMatch) {
                  this.logger.error(`[getAttempt] [STUDENT MATCH] ❌❌❌ qId: ${questionIdStr}: DELETED QUESTION with NO PAIRS in snapshot - Cannot display this question!`);
                }
                this.logger.error(`[getAttempt] [STUDENT MATCH] ❌ Original question NOT FOUND in questionsMap! questionsMap size: ${questionsMap.size}, keys: ${Array.from(questionsMap.keys()).join(', ')}`);
              }
            }
          }
          
          // Log النتيجة النهائية
          this.logger.warn(`[getAttempt] [STUDENT MATCH] qId: ${questionIdStr}: FINAL RESULT - hasMatchPairs: ${!!itemResult.matchPairs}, hasAnswerKeyMatch: ${!!itemResult.answerKeyMatch}, matchPairsLen: ${itemResult.matchPairs?.length || 0}, answerKeyMatchLen: ${itemResult.answerKeyMatch?.length || 0}`);
          if (!itemResult.matchPairs && !itemResult.answerKeyMatch) {
            this.logger.error(`[getAttempt] [STUDENT MATCH] ❌❌❌ qId: ${questionIdStr}: FINAL RESULT HAS NO PAIRS - THIS QUESTION WILL SHOW ERROR ON FRONTEND!`);
          }
        }

        // إضافة إجابات الطالب
        if (item.studentAnswerIndexes) itemResult.studentAnswerIndexes = item.studentAnswerIndexes;
        if (item.studentAnswerText) itemResult.studentAnswerText = item.studentAnswerText;
        // للتوافق مع الكود القديم (True/False boolean)
        if (item.studentAnswerBoolean !== undefined)
          itemResult.studentAnswerBoolean = item.studentAnswerBoolean;
        if (item.studentAnswerMatch) itemResult.studentAnswerMatch = item.studentAnswerMatch;
        if (item.studentAnswerReorder) itemResult.studentAnswerReorder = item.studentAnswerReorder;
        
        // إضافة interactive_text snapshots للفرونت
        if (item.qType === QuestionType.INTERACTIVE_TEXT) {
          // إضافة interactiveTextSnapshot (النص مع placeholders)
          if (item.interactiveTextSnapshot) {
            itemResult.interactiveTextSnapshot = item.interactiveTextSnapshot;
          } else if (item.textSnapshot) {
            // fallback للتوافق مع الكود القديم
            itemResult.interactiveTextSnapshot = item.textSnapshot;
          }
          
          // إضافة interactiveBlanksSnapshot (الفراغات مع type, options, hints - بدون correctAnswers للطالب)
          if (item.interactiveBlanksSnapshot && Array.isArray(item.interactiveBlanksSnapshot) && item.interactiveBlanksSnapshot.length > 0) {
            // للطالب: نرسل الفراغات بدون correctAnswers (للأمان)
            // للمعلم/الأدمن: نرسل correctAnswers أيضاً
            if (isStudent && policy !== 'explanations_with_scores') {
              itemResult.interactiveBlanksSnapshot = item.interactiveBlanksSnapshot.map((blank: any) => ({
                id: blank.id,
                type: blank.type === 'select' ? 'dropdown' : blank.type, // توحيد select إلى dropdown
                options: blank.options || blank.choices, // استخدام options إذا كان موجوداً، وإلا choices
                hint: blank.hint,
                // لا نرسل correctAnswers للطالب
              }));
            } else {
              // للمعلم/الأدمن: نرسل كل شيء بما فيه correctAnswers
              itemResult.interactiveBlanksSnapshot = item.interactiveBlanksSnapshot.map((blank: any) => ({
                ...blank,
                type: blank.type === 'select' ? 'dropdown' : blank.type, // توحيد select إلى dropdown
                options: blank.options || blank.choices, // استخدام options إذا كان موجوداً، وإلا choices
              }));
            }
          }
          
          // إضافة interactiveReorderSnapshot إذا كان موجوداً
          if (item.interactiveReorderSnapshot) {
            itemResult.interactiveReorderSnapshot = item.interactiveReorderSnapshot;
          }
          
          // إضافة إجابات الطالب للفراغات التفاعلية
          if (item.studentInteractiveAnswers) {
            itemResult.studentInteractiveAnswers = item.studentInteractiveAnswers;
          }
          if (item.studentReorderAnswer) {
            itemResult.studentReorderAnswer = item.studentReorderAnswer;
          }
        }
        
        // إضافة تفاصيل Match pairs للنتائج (يظهر كل زوج وما إذا كان صحيحاً)
        if (item.qType === QuestionType.MATCH && itemResult.matchPairs && Array.isArray(itemResult.matchPairs)) {
          // بناء correctMap من answerKeyMatch أو matchPairs
          let correctPairs: [string, string][] = [];
          if (item.answerKeyMatch && Array.isArray(item.answerKeyMatch) && item.answerKeyMatch.length > 0) {
            correctPairs = item.answerKeyMatch;
          } else if (item.matchPairs && Array.isArray(item.matchPairs) && item.matchPairs.length > 0) {
            correctPairs = item.matchPairs.map((p: { left: string; right: string }) => [p.left, p.right] as [string, string]);
          }
          
          // بناء correctMap مع normalization
          const correctMap = new Map<string, string>();
          for (const [left, right] of correctPairs) {
            const normalizedLeft = normalizeAnswer(left);
            const normalizedRight = normalizeAnswer(right);
            correctMap.set(normalizedLeft, normalizedRight);
          }
          
          // بناء studentMap من studentAnswerMatch
          const studentMap = new Map<string, string>();
          if (item.studentAnswerMatch) {
            if (Array.isArray(item.studentAnswerMatch)) {
              if (item.studentAnswerMatch.length > 0) {
                const firstElement = item.studentAnswerMatch[0];
                if (Array.isArray(firstElement) && firstElement.length === 2) {
                  // Array of tuples
                  for (const pair of item.studentAnswerMatch) {
                    if (Array.isArray(pair) && pair.length === 2) {
                      const normalizedLeft = normalizeAnswer(pair[0]);
                      const normalizedRight = normalizeAnswer(pair[1]);
                      studentMap.set(normalizedLeft, normalizedRight);
                    }
                  }
                } else if (typeof firstElement === 'string') {
                  // Array of strings (right values only)
                  const leftItems = correctPairs.map(([left]: [string, string]) => left);
                  if (item.studentAnswerMatch.length === leftItems.length) {
                    for (let i = 0; i < leftItems.length; i++) {
                      const normalizedLeft = normalizeAnswer(leftItems[i]);
                      const normalizedRight = normalizeAnswer(item.studentAnswerMatch[i]);
                      studentMap.set(normalizedLeft, normalizedRight);
                    }
                  }
                }
              }
            } else if (typeof item.studentAnswerMatch === 'object' && !Array.isArray(item.studentAnswerMatch)) {
              // Object mapping
              const leftItems = correctPairs.map(([left]: [string, string]) => left);
              for (const [key, value] of Object.entries(item.studentAnswerMatch)) {
                if (typeof value === 'string') {
                  const keyAsIndex = parseInt(key, 10);
                  if (!isNaN(keyAsIndex) && keyAsIndex >= 0 && keyAsIndex < leftItems.length) {
                    const normalizedLeft = normalizeAnswer(leftItems[keyAsIndex]);
                    const normalizedRight = normalizeAnswer(value);
                    studentMap.set(normalizedLeft, normalizedRight);
                  } else {
                    const normalizedLeft = normalizeAnswer(key);
                    const normalizedRight = normalizeAnswer(value);
                    studentMap.set(normalizedLeft, normalizedRight);
                  }
                }
              }
            }
          }
          
          // بناء matchPairsDetails مع تفاصيل كل زوج
          const matchPairsDetails = itemResult.matchPairs.map((pair: { left: string; right: string }) => {
            const normalizedLeft = normalizeAnswer(pair.left);
            const correctRight = correctMap.get(normalizedLeft);
            const studentRight = studentMap.get(normalizedLeft);
            const isCorrect = correctRight && studentRight && normalizeAnswer(correctRight) === normalizeAnswer(studentRight);
            
            return {
              left: pair.left,
              correctRight: correctRight || pair.right, // الإجابة الصحيحة
              studentRight: studentRight || null, // إجابة الطالب
              isCorrect: !!isCorrect,
            };
          });
          
          itemResult.matchPairsDetails = matchPairsDetails;
        }
        // تحويل studentRecording إلى URL كامل
        if (item.studentRecording) {
          const baseUrl = this.configService.get<string>('PUBLIC_BASE_URL') || this.configService.get<string>('APP_URL', 'https://api.deutsch-tests.com');
          // إذا كان url مسار نسبي، نحوله إلى URL كامل
          const recordingUrl = item.studentRecording.url.startsWith('http')
            ? item.studentRecording.url
            : `${baseUrl}${item.studentRecording.url.startsWith('/') ? '' : '/'}${item.studentRecording.url}`;
          
          itemResult.studentRecording = {
            url: recordingUrl,
            mime: item.studentRecording.mime,
            ...(item.studentRecording.durationMs && { durationMs: item.studentRecording.durationMs }),
          };
        }

        // إضافة media (الأولوية لـ mediaSnapshot)
        // تخطي mediaSnapshot إذا كان الصوت تبع الـ section (لمنع ظهور مشغلين صوت)
        const itemClipId = item.listeningClipId?.toString();
        const isItemAudioFromSection = itemClipId && sectionAudioClipIds.has(itemClipId);
        if (item.mediaSnapshot && !isItemAudioFromSection) {
          const baseUrl = this.configService.get<string>('PUBLIC_BASE_URL') || this.configService.get<string>('APP_URL', 'https://api.deutsch-tests.com');
          // تحديث URL إذا كان مسار نسبي أو localhost
          let mediaUrl = item.mediaSnapshot.url;
          if (mediaUrl && !mediaUrl.startsWith('http')) {
            // مسار نسبي
            mediaUrl = `${baseUrl}${mediaUrl.startsWith('/') ? '' : '/'}${mediaUrl}`;
          } else if (mediaUrl && (mediaUrl.includes('localhost:4000') || mediaUrl.includes('/media/mock/'))) {
            // استبدال localhost أو mock URL بـ baseUrl
            if (item.mediaSnapshot.key) {
              mediaUrl = `${baseUrl}/uploads/${item.mediaSnapshot.key}`;
            } else {
              mediaUrl = mediaUrl.replace(/http:\/\/localhost:4000/g, baseUrl);
            }
          }
          itemResult.mediaSnapshot = {
            ...item.mediaSnapshot,
            url: mediaUrl || item.mediaSnapshot.url,
          };
        } else if ((item.mediaUrl || item.mediaType) && !isItemAudioFromSection) {
          // للتوافق مع الكود القديم
          const baseUrl = this.configService.get<string>('PUBLIC_BASE_URL') || this.configService.get<string>('APP_URL', 'https://api.deutsch-tests.com');
          let mediaUrl = item.mediaUrl;
          if (mediaUrl && !mediaUrl.startsWith('http')) {
            mediaUrl = `${baseUrl}${mediaUrl.startsWith('/') ? '' : '/'}${mediaUrl}`;
          } else if (mediaUrl && (mediaUrl.includes('localhost:4000') || mediaUrl.includes('/media/mock/'))) {
            // استبدال localhost أو mock URL
            mediaUrl = mediaUrl.replace(/http:\/\/localhost:4000/g, baseUrl);
            if (mediaUrl.includes('/media/mock/') && item.mediaKey) {
              mediaUrl = `${baseUrl}/uploads/${item.mediaKey}`;
            }
          }
          itemResult.mediaType = item.mediaType;
          itemResult.mediaUrl = mediaUrl || item.mediaUrl;
          itemResult.mediaMime = item.mediaMime;
        }
        
        // إضافة imagesSnapshot إذا كان موجوداً
        if (item.imagesSnapshot && Array.isArray(item.imagesSnapshot) && item.imagesSnapshot.length > 0) {
          const baseUrl = this.configService.get<string>('PUBLIC_BASE_URL') || this.configService.get<string>('APP_URL', 'https://api.deutsch-tests.com');
          itemResult.imagesSnapshot = item.imagesSnapshot.map((img: any) => {
            let imgUrl = img.url;
            
            // إذا كان URL mock أو localhost أو غير صالح، نبني واحد من الـ key
            if (img.key && (!imgUrl || imgUrl.includes('/media/mock/') || imgUrl.includes('localhost:4000'))) {
              imgUrl = `${baseUrl}/uploads/${img.key}`;
            } else if (imgUrl && !imgUrl.startsWith('http')) {
              // مسار نسبي
              imgUrl = `${baseUrl}${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
            } else if (imgUrl && imgUrl.includes('localhost:4000')) {
              // استبدال localhost بـ baseUrl
              imgUrl = imgUrl.replace(/http:\/\/localhost:4000/g, baseUrl);
            }
            
            return {
              ...img,
              url: imgUrl || img.url,
            };
          });
        }

        return itemResult;
      });
    }

    return result;
  }

  /**
   * إرفاق تسجيل صوتي لإجابة الطالب
   */
  async attachStudentRecording(
    user: ReqUser,
    attemptId: string,
    itemId: string,
    recording: { url: string; mime: string; durationMs?: number },
  ) {
    const attempt = await this.attemptModel.findById(attemptId).exec();
    if (!attempt) {
      throw new NotFoundException(`Attempt ${attemptId} not found`);
    }

    // التحقق من الصلاحيات: فقط الطالب المالك يمكنه رفع التسجيل
    if (attempt.studentId.toString() !== user.userId) {
      throw new ForbiddenException('You can only upload recordings for your own attempts');
    }

    // التحقق من أن المحاولة لم يتم تسليمها بعد
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot upload recording for a submitted attempt');
    }

    // البحث عن الـ item
    // itemId يمكن أن يكون questionId أو index في الـ array
    let itemIndex = -1;
    if (Types.ObjectId.isValid(itemId)) {
      // إذا كان itemId هو ObjectId، نبحث عن questionId
      itemIndex = attempt.items.findIndex((item) => item.questionId.toString() === itemId);
    } else {
      // إذا كان itemId هو index (رقم)
      const index = parseInt(itemId, 10);
      if (!isNaN(index) && index >= 0 && index < attempt.items.length) {
        itemIndex = index;
      }
    }

    if (itemIndex === -1) {
      throw new NotFoundException(`Item ${itemId} not found in attempt ${attemptId}`);
    }

    // حفظ التسجيل
    attempt.items[itemIndex].studentRecording = recording;
    await attempt.save();

    this.logger.log(
      `[attachStudentRecording] Recording attached to attempt ${attemptId}, item ${itemId} by user ${user.userId}`,
    );

    return { success: true, recording };
  }

  /**
   * حذف سؤال محذوف من المحاولة (admin only)
   */
  async removeDeletedQuestionFromAttempt(user: ReqUser, attemptId: string, questionId: string) {
    // فقط admin يمكنه حذف أسئلة من المحاولات
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can remove questions from attempts');
    }

    const attempt = await this.attemptModel.findById(attemptId).exec();
    if (!attempt) {
      throw new NotFoundException(`Attempt ${attemptId} not found`);
    }

    // البحث عن السؤال في items
    const itemIndex = attempt.items.findIndex(
      (item: any) => item.questionId.toString() === questionId,
    );

    if (itemIndex === -1) {
      throw new NotFoundException(`Question ${questionId} not found in attempt ${attemptId}`);
    }

    const item = attempt.items[itemIndex];
    this.logger.warn(`[removeDeletedQuestionFromAttempt] Removing question ${questionId} (qType: ${item.qType}) from attempt ${attemptId}`);

    // حذف السؤال من items
    attempt.items.splice(itemIndex, 1);

    // إعادة حساب totalMaxScore
    attempt.totalMaxScore = attempt.items.reduce((sum: number, item: any) => {
      return sum + (item.points || 0);
    }, 0);

    await attempt.save();

    this.logger.log(
      `[removeDeletedQuestionFromAttempt] Question ${questionId} removed from attempt ${attemptId}. New items count: ${attempt.items.length}`,
    );

    return {
      success: true,
      message: `Question ${questionId} removed from attempt ${attemptId}`,
      newItemsCount: attempt.items.length,
    };
  }

  // ==================== Schreiben Form Field Check ====================

  /**
   * فحص إجابة حقل واحد في نموذج Schreiben (بدون تسليم)
   * يرجع إذا الإجابة صحيحة + الإجابة الصحيحة
   */
  async checkSchreibenField(
    user: ReqUser,
    attemptId: string,
    fieldId: string,
    answer: string | string[],
  ) {
    // التحقق من ملكية المحاولة
    const attempt = await this.attemptModel
      .findOne({
        _id: new Types.ObjectId(attemptId),
        studentId: new Types.ObjectId(user.userId),
      })
      .exec();

    if (!attempt) {
      throw new NotFoundException('المحاولة غير موجودة');
    }

    // جلب الامتحان
    const exam = await this.examModel.findById(attempt.examId).lean();
    if (!exam || exam.mainSkill !== 'schreiben' || !exam.schreibenTaskId) {
      throw new BadRequestException('هذا الامتحان ليس من نوع Schreiben');
    }

    // جلب مهمة الكتابة
    const schreibenTask = await this.schreibenTaskModel
      .findById(exam.schreibenTaskId)
      .lean();

    if (!schreibenTask) {
      throw new NotFoundException('مهمة الكتابة غير موجودة');
    }

    // جمع كل حقول النموذج مع معلومات الموقع (blockIndex, fieldIndex)
    const allFieldsWithPosition: Array<{ field: any; formBlockIndex: number; fieldIndex: number; globalIndex: number }> = [];
    let formBlockCounter = 0;
    let globalFieldIndex = 0;
    for (const block of schreibenTask.contentBlocks || []) {
      if (block.type === 'form' && (block.data as any)?.fields) {
        formBlockCounter++;
        const fields = (block.data as any).fields;
        for (let fi = 0; fi < fields.length; fi++) {
          allFieldsWithPosition.push({
            field: fields[fi],
            formBlockIndex: formBlockCounter, // 1-based
            fieldIndex: fi, // 0-based within block
            globalIndex: globalFieldIndex++, // 0-based global
          });
        }
      }
    }

    this.logger.warn(
      `[checkSchreibenField] Looking for fieldId="${fieldId}". Available fields: ${JSON.stringify(
        allFieldsWithPosition.map(f => ({
          id: f.field.id,
          number: f.field.number,
          label: f.field.label,
          _id: f.field._id,
          formBlock: f.formBlockIndex,
          fieldIdx: f.fieldIndex,
          globalIdx: f.globalIndex,
        })),
      )}`,
    );

    // البحث عن الحقل بأكثر من طريقة
    let targetField: any = null;

    for (const entry of allFieldsWithPosition) {
      const f = entry.field;
      if (
        String(f.id) === String(fieldId) ||
        String(f.number) === String(fieldId) ||
        f.label === fieldId ||
        (f._id && String(f._id) === String(fieldId))
      ) {
        targetField = f;
        break;
      }
    }

    // محاولة تحليل صيغة field_X_Y (مثل field_1_0)
    if (!targetField) {
      const match = String(fieldId).match(/^field_(\d+)_(\d+)$/);
      if (match) {
        const blockIdx = parseInt(match[1], 10); // 1-based form block index
        const fieldIdx = parseInt(match[2], 10); // 0-based field index within block
        const found = allFieldsWithPosition.find(
          e => e.formBlockIndex === blockIdx && e.fieldIndex === fieldIdx,
        );
        if (found) {
          targetField = found.field;
          this.logger.warn(
            `[checkSchreibenField] Matched field_${blockIdx}_${fieldIdx} -> field id=${found.field.id}, label=${found.field.label}`,
          );
        }
      }
    }

    // محاولة بالـ global index
    if (!targetField) {
      const idx = parseInt(String(fieldId), 10);
      if (!isNaN(idx)) {
        const found = allFieldsWithPosition.find(e => e.globalIndex === idx);
        if (found) {
          targetField = found.field;
        }
      }
    }

    if (!targetField) {
      throw new NotFoundException(`الحقل ${fieldId} غير موجود`);
    }

    // طباعة كل خصائص الحقل لتشخيص مشكلة الإجابة الصحيحة الفارغة
    this.logger.warn(
      `[checkSchreibenField] Found field - ALL PROPERTIES: ${JSON.stringify(targetField)}`,
    );

    // دالة مساعدة: البحث عن الإجابة الصحيحة في أماكن مختلفة
    const getCorrectValue = (field: any): string => {
      return field.value || field.correctAnswer || field.answer || field.correctValue || '';
    };
    const getCorrectArray = (field: any): string[] => {
      return field.correctAnswers || field.correctOptions || field.answers || [];
    };

    // تحويل إجابة الطالب لصيغة موحدة
    const studentStr: string = Array.isArray(answer) ? answer[0] || '' : String(answer || '');
    const studentArr: string[] = Array.isArray(answer) ? answer.map(String) : [String(answer || '')];

    // فحص الإجابة
    let isCorrect = false;
    let correctAnswer: string | string[] = '';

    const fieldType = targetField.fieldType || '';
    switch (fieldType) {
      case 'text_input':
      case FormFieldType.TEXT_INPUT: {
        correctAnswer = getCorrectValue(targetField);
        if (!correctAnswer && getCorrectArray(targetField).length > 0) {
          correctAnswer = getCorrectArray(targetField)[0];
        }
        if (typeof correctAnswer === 'string' && correctAnswer) {
          isCorrect = normalizeAnswer(studentStr) === normalizeAnswer(correctAnswer);
        }
        break;
      }
      case 'select':
      case FormFieldType.SELECT: {
        const correctArr = getCorrectArray(targetField);
        const correctVal = getCorrectValue(targetField);
        if (correctArr.length > 0) {
          correctAnswer = correctArr;
        } else if (correctVal) {
          correctAnswer = [correctVal];
        } else {
          correctAnswer = [];
        }
        if (Array.isArray(correctAnswer) && correctAnswer.length > 0) {
          isCorrect = (correctAnswer as string[]).some(
            (ca: string) => normalizeAnswer(ca) === normalizeAnswer(studentStr),
          );
        }
        break;
      }
      case 'multiselect':
      case FormFieldType.MULTISELECT: {
        const correctArr = getCorrectArray(targetField);
        correctAnswer = correctArr.length > 0 ? correctArr : (getCorrectValue(targetField) ? [getCorrectValue(targetField)] : []);
        if (Array.isArray(correctAnswer) && correctAnswer.length > 0) {
          const normStudent = studentArr.filter(a => a.trim()).map(a => normalizeAnswer(a)).sort();
          const normCorrect = (correctAnswer as string[]).map(a => normalizeAnswer(a)).sort();
          isCorrect =
            normStudent.length === normCorrect.length &&
            normStudent.every((a, i) => a === normCorrect[i]);
        }
        break;
      }
      default: {
        correctAnswer = getCorrectValue(targetField) || getCorrectArray(targetField);
        if (typeof correctAnswer === 'string' && correctAnswer) {
          isCorrect = normalizeAnswer(studentStr) === normalizeAnswer(correctAnswer);
        } else if (Array.isArray(correctAnswer) && correctAnswer.length > 0) {
          isCorrect = (correctAnswer as string[]).some(
            (ca: string) => normalizeAnswer(ca) === normalizeAnswer(studentStr),
          );
        }
        break;
      }
    }

    this.logger.warn(
      `[checkSchreibenField] Result: fieldType=${fieldType}, studentAnswer=${JSON.stringify(answer)}, correctAnswer=${JSON.stringify(correctAnswer)}, isCorrect=${isCorrect}`,
    );

    return {
      fieldId: targetField.id || String(targetField.number),
      label: targetField.label,
      studentAnswer: answer,
      correctAnswer,
      isCorrect,
      points: isCorrect ? 1 : 0,
    };
  }

  // ==================== Schreiben Form Submission ====================

  /**
   * تسليم إجابات نموذج Schreiben وتصحيحها تلقائياً
   */
  async submitSchreibenAttempt(
    user: ReqUser,
    attemptId: string,
    formAnswers: Array<{ fieldId: string; answer: string | string[] }>,
  ) {
    // التحقق من ملكية المحاولة
    const attempt = await this.attemptModel
      .findOne({
        _id: new Types.ObjectId(attemptId),
        studentId: new Types.ObjectId(user.userId),
      })
      .exec();

    if (!attempt) {
      throw new NotFoundException(`المحاولة غير موجودة أو ليس لديك صلاحية`);
    }

    if (attempt.studentId.toString() !== user.userId) {
      throw new ForbiddenException('لا يمكنك تسليم محاولة غيرك');
    }

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new ForbiddenException('المحاولة تم تسليمها مسبقاً');
    }

    // جلب الامتحان والتحقق أنه Schreiben
    const exam = await this.examModel.findById(attempt.examId).lean();
    if (!exam || exam.mainSkill !== 'schreiben' || !exam.schreibenTaskId) {
      throw new BadRequestException('هذا الامتحان ليس من نوع Schreiben');
    }

    // جلب مهمة الكتابة مع الإجابات الصحيحة
    const schreibenTask = await this.schreibenTaskModel
      .findById(exam.schreibenTaskId)
      .lean();

    if (!schreibenTask) {
      throw new NotFoundException('مهمة الكتابة غير موجودة');
    }

    // جمع كل حقول النموذج من contentBlocks مع معلومات الموقع
    const allFormFields: any[] = [];
    const fieldPositionMap = new Map<any, { formBlockIndex: number; fieldIndex: number; globalIndex: number }>();
    let formBlockCounter = 0;
    let globalFieldIndex = 0;
    for (const block of schreibenTask.contentBlocks || []) {
      if (block.type === 'form' && (block.data as any)?.fields) {
        formBlockCounter++;
        const fields = (block.data as any).fields;
        for (let fi = 0; fi < fields.length; fi++) {
          allFormFields.push(fields[fi]);
          fieldPositionMap.set(fields[fi], {
            formBlockIndex: formBlockCounter, // 1-based
            fieldIndex: fi, // 0-based within block
            globalIndex: globalFieldIndex++, // 0-based global
          });
        }
      }
    }

    if (allFormFields.length === 0) {
      throw new BadRequestException('المهمة لا تحتوي على حقول نموذج');
    }

    // Logging لكل الحقول للتشخيص
    this.logger.warn(
      `[submitSchreibenAttempt] ALL form fields: ${JSON.stringify(allFormFields.map((f: any) => {
        const pos = fieldPositionMap.get(f);
        return { id: f.id, number: f.number, label: f.label, fieldType: f.fieldType, isStudentField: f.isStudentField, pos: pos ? `field_${pos.formBlockIndex}_${pos.fieldIndex}` : null };
      }))}`,
    );

    // التحقق أن كل الحقول المطلوبة تم ملؤها
    const studentFields = allFormFields.filter((f: any) => {
      if (f.fieldType === FormFieldType.PREFILLED || f.fieldType === 'prefilled') return false;
      if (f.isStudentField === false) return false;
      if (f.readOnly === true || f.readonly === true || f.disabled === true) return false;
      return true;
    });

    // بناء خريطة الإجابات بأكثر من مفتاح للمرونة
    const answerMap = new Map<string, string | string[]>();
    for (const a of formAnswers) {
      answerMap.set(String(a.fieldId), a.answer);
    }

    // بناء خريطة عكسية: field_X_Y -> answer (لدعم صيغة الفرونت)
    for (const a of formAnswers) {
      const fid = String(a.fieldId);
      const match = fid.match(/^field_(\d+)_(\d+)$/);
      if (match) {
        const blockIdx = parseInt(match[1], 10);
        const fieldIdx = parseInt(match[2], 10);
        // إيجاد الحقل المقابل وربط الإجابة بالـ id الحقيقي
        for (const [field, pos] of fieldPositionMap.entries()) {
          if (pos.formBlockIndex === blockIdx && pos.fieldIndex === fieldIdx) {
            const realKey = field.id || String(field.number);
            answerMap.set(realKey, a.answer);
            this.logger.warn(
              `[submitSchreibenAttempt] Mapped ${fid} -> realKey="${realKey}" (label=${field.label})`,
            );
            break;
          }
        }
      }
    }

    this.logger.warn(
      `[submitSchreibenAttempt] Student fields (after filter): ${JSON.stringify(studentFields.map((f: any) => ({ id: f.id, number: f.number, label: f.label, fieldType: f.fieldType })))}`,
    );
    this.logger.warn(
      `[submitSchreibenAttempt] Submitted answers: ${JSON.stringify(formAnswers.map((a) => ({ fieldId: a.fieldId, answerType: typeof a.answer })))}`,
    );
    this.logger.warn(
      `[submitSchreibenAttempt] AnswerMap keys: ${JSON.stringify([...answerMap.keys()])}`,
    );

    // دالة مساعدة للبحث عن إجابة الحقل بأكثر من طريقة
    const findAnswer = (field: any, fieldIndex: number): string | string[] | undefined => {
      // محاولة 1: بالـ id مباشرة
      if (field.id && answerMap.has(String(field.id))) {
        return answerMap.get(String(field.id));
      }
      // محاولة 2: بالـ number كنص (1-based)
      if (field.number !== undefined && answerMap.has(String(field.number))) {
        return answerMap.get(String(field.number));
      }
      // محاولة 3: بالـ label
      if (field.label && answerMap.has(field.label)) {
        return answerMap.get(field.label);
      }
      // محاولة 4: بالـ _id (MongoDB ID)
      if (field._id && answerMap.has(String(field._id))) {
        return answerMap.get(String(field._id));
      }
      // محاولة 5: بالـ index (0-based) كنص
      if (answerMap.has(String(fieldIndex))) {
        return answerMap.get(String(fieldIndex));
      }
      // محاولة 6: بالـ number - 1 (0-based index من number)
      if (field.number !== undefined && answerMap.has(String(field.number - 1))) {
        return answerMap.get(String(field.number - 1));
      }
      return undefined;
    };

    // بناء خريطة normalized: field key -> answer (لاستخدامها في التصحيح)
    const normalizedAnswerMap = new Map<string, string | string[]>();

    for (let i = 0; i < studentFields.length; i++) {
      const field = studentFields[i];
      let answer = findAnswer(field, i);

      // محاولة أخيرة: لو الفرونت بعت إجابات بالترتيب بدون fieldId صحيح
      if (answer === undefined && i < formAnswers.length) {
        answer = formAnswers[i]?.answer;
      }

      if (answer && !((typeof answer === 'string' && answer.trim() === '') || (Array.isArray(answer) && answer.length === 0))) {
        normalizedAnswerMap.set(field.id || String(field.number), answer);
      }
    }

    // التحقق أن الطالب أرسل إجابة واحدة على الأقل
    if (normalizedAnswerMap.size === 0 && formAnswers.length === 0) {
      throw new BadRequestException('يجب إرسال إجابة واحدة على الأقل');
    }

    // تصحيح الإجابات - فقط الحقول اللي الطالب جاوب عليها
    const answeredFields = allFormFields.filter((f: any) => {
      const key = f.id || String(f.number);
      return normalizedAnswerMap.has(key);
    });
    const { results, score, maxScore } = this.gradeSchreibenFormFields(
      answeredFields,
      normalizedAnswerMap,
    );

    // حفظ الإجابات والنتائج
    attempt.schreibenFormAnswers = Object.fromEntries(normalizedAnswerMap);
    attempt.schreibenFormResults = results;
    attempt.schreibenFormScore = score;
    attempt.schreibenFormMaxScore = maxScore;
    attempt.totalMaxScore = maxScore;
    attempt.finalScore = score;
    attempt.status = AttemptStatus.SUBMITTED;
    attempt.submittedAt = new Date();

    await attempt.save();

    this.logger.log(
      `[submitSchreibenAttempt] Attempt ${attemptId} submitted. Score: ${score}/${maxScore}`,
    );

    // بناء مصفوفة النتائج مرتبة بنفس ترتيب الحقول عشان الفرونت يعرضها تحت كل حقل
    const fieldsResults = allFormFields.map((field: any) => {
      const fieldKey = field.id || String(field.number);
      const result = results[fieldKey];
      return {
        fieldId: field.id,
        fieldNumber: field.number,
        label: field.label,
        fieldType: field.fieldType,
        isStudentField: field.isStudentField !== false && field.fieldType !== 'prefilled',
        studentAnswer: result?.studentAnswer || null,
        correctAnswer: result?.correctAnswer || field.value || null,
        isCorrect: result?.isCorrect || false,
        points: result?.points || 0,
        wasAnswered: !!result,
      };
    });

    return {
      success: true,
      message: 'تم تسليم الإجابات وتصحيحها',
      score,
      maxScore,
      percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
      results, // النتائج كـ object بالـ fieldId
      fieldsResults, // النتائج كمصفوفة مرتبة بنفس ترتيب الحقول
    };
  }

  /**
   * تصحيح حقول النموذج تلقائياً
   */
  private gradeSchreibenFormFields(
    allFormFields: any[],
    answerMap: Map<string, string | string[]>,
  ): {
    results: Record<string, any>;
    score: number;
    maxScore: number;
  } {
    const results: Record<string, any> = {};
    let score = 0;
    let maxScore = 0;

    // دالة مساعدة: البحث عن الإجابة الصحيحة في أماكن مختلفة
    const getCorrectValue = (f: any): string => {
      return f.value || f.correctAnswer || f.answer || f.correctValue || '';
    };
    const getCorrectArray = (f: any): string[] => {
      return f.correctAnswers || f.correctOptions || f.answers || [];
    };

    for (const field of allFormFields) {
      maxScore += 1; // كل حقل يساوي 1 نقطة
      const fieldKey = field.id || String(field.number);
      const studentAnswer = answerMap.get(fieldKey);
      let isCorrect = false;
      let correctAnswer: string | string[] = '';

      // تحويل إجابة الطالب لصيغة موحدة (string و array)
      const studentStr: string = Array.isArray(studentAnswer) ? studentAnswer[0] || '' : String(studentAnswer || '');
      const studentArr: string[] = Array.isArray(studentAnswer) ? studentAnswer.map(String) : (studentAnswer ? [String(studentAnswer)] : []);

      const fieldType = field.fieldType || '';
      switch (fieldType) {
        case 'text_input':
        case FormFieldType.TEXT_INPUT: {
          correctAnswer = getCorrectValue(field);
          if (!correctAnswer && getCorrectArray(field).length > 0) {
            correctAnswer = getCorrectArray(field)[0];
          }
          if (typeof correctAnswer === 'string' && correctAnswer) {
            isCorrect =
              normalizeAnswer(studentStr) === normalizeAnswer(correctAnswer);
          }
          break;
        }

        case 'select':
        case FormFieldType.SELECT: {
          const correctArr = getCorrectArray(field);
          const correctVal = getCorrectValue(field);
          if (correctArr.length > 0) {
            correctAnswer = correctArr;
          } else if (correctVal) {
            correctAnswer = [correctVal];
          } else {
            correctAnswer = [];
          }
          if (Array.isArray(correctAnswer) && correctAnswer.length > 0) {
            isCorrect = (correctAnswer as string[]).some(
              (ca: string) => normalizeAnswer(ca) === normalizeAnswer(studentStr),
            );
          }
          break;
        }

        case 'multiselect':
        case FormFieldType.MULTISELECT: {
          const correctArr = getCorrectArray(field);
          correctAnswer = correctArr.length > 0 ? correctArr : (getCorrectValue(field) ? [getCorrectValue(field)] : []);
          if (Array.isArray(correctAnswer) && correctAnswer.length > 0) {
            const normStudent = studentArr.filter(a => a.trim()).map(a => normalizeAnswer(a)).sort();
            const normCorrect = (correctAnswer as string[]).map(a => normalizeAnswer(a)).sort();
            isCorrect =
              normStudent.length === normCorrect.length &&
              normStudent.every(
                (a: string, i: number) => a === normCorrect[i],
              );
          }
          break;
        }

        default: {
          correctAnswer = getCorrectValue(field) || getCorrectArray(field);
          if (typeof correctAnswer === 'string' && correctAnswer) {
            isCorrect = normalizeAnswer(studentStr) === normalizeAnswer(correctAnswer);
          } else if (Array.isArray(correctAnswer) && correctAnswer.length > 0) {
            isCorrect = (correctAnswer as string[]).some(
              (ca: string) => normalizeAnswer(ca) === normalizeAnswer(studentStr),
            );
          }
          break;
        }
      }

      if (isCorrect) {
        score += 1;
      }

      results[fieldKey] = {
        label: field.label,
        fieldType: field.fieldType,
        studentAnswer: studentAnswer || '',
        correctAnswer,
        isCorrect,
        points: isCorrect ? 1 : 0,
      };
    }

    return { results, score, maxScore };
  }

  /**
   * حذف أسئلة contentOnly الوهمية من جميع المحاولات القديمة
   */
  async cleanupContentOnlyFromAttempts(): Promise<{ modifiedAttempts: number; removedItems: number; deletedEmptyAttempts?: number }> {
    // 1. جلب جميع questionIds التي هي contentOnly
    const contentOnlyQuestions = await this.questionModel
      .find({ contentOnly: true })
      .select('_id')
      .lean();

    if (contentOnlyQuestions.length === 0) {
      // حتى لو مفيش contentOnly، نحذف المحاولات الفاضية
      const emptyResult = await this.attemptModel.deleteMany({
        status: 'in_progress',
        $or: [{ items: { $size: 0 } }, { items: { $exists: false } }],
      });
      return { modifiedAttempts: 0, removedItems: 0, deletedEmptyAttempts: emptyResult.deletedCount };
    }

    const contentOnlyIds = contentOnlyQuestions.map((q: any) => q._id.toString());
    this.logger.log(`[cleanup] Found ${contentOnlyIds.length} contentOnly questions to remove from attempts`);

    // 2. البحث عن المحاولات التي تحتوي على هذه الأسئلة
    const attempts = await this.attemptModel.find({
      'items.questionId': { $in: contentOnlyIds.map(id => new Types.ObjectId(id)) },
    });

    let removedItems = 0;
    for (const attempt of attempts) {
      const before = attempt.items.length;
      attempt.items = attempt.items.filter(
        (item: any) => !contentOnlyIds.includes(item.questionId.toString()),
      ) as any;
      const removed = before - attempt.items.length;
      if (removed > 0) {
        removedItems += removed;
        // إعادة حساب totalMaxScore
        attempt.totalMaxScore = attempt.items.reduce((sum: number, item: any) => sum + (item.points || 0), 0);
        await attempt.save();
      }
    }

    this.logger.log(`[cleanup] Modified ${attempts.length} attempts, removed ${removedItems} contentOnly items`);

    // 3. حذف المحاولات الفاضية (in_progress بدون أسئلة)
    const emptyResult = await this.attemptModel.deleteMany({
      status: 'in_progress',
      $or: [
        { items: { $size: 0 } },
        { items: { $exists: false } },
      ],
    });
    this.logger.log(`[cleanup] Deleted ${emptyResult.deletedCount} empty in_progress attempts`);

    return { modifiedAttempts: attempts.length, removedItems, deletedEmptyAttempts: emptyResult.deletedCount };
  }
}
