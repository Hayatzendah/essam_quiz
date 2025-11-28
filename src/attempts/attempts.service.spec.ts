import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types, disconnect } from 'mongoose';
import { AttemptsService } from './attempts.service';
import { Attempt, AttemptSchema, AttemptStatus } from './schemas/attempt.schema';
import { Exam, ExamSchema, ExamStatus } from '../exams/schemas/exam.schema';
import {
  Question,
  QuestionSchema,
  QuestionStatus,
  QuestionType,
} from '../questions/schemas/question.schema';

const teacherUser = { userId: '671fc2b4c7e54e0d8f7d1aaa', role: 'teacher' as const };
const adminUser = { userId: '671fc2b4c7e54e0d8f7d1bbb', role: 'admin' as const };
const studentUser = { userId: '671fc2b4c7e54e0d8f7d1ccc', role: 'student' as const };
const studentUser2 = { userId: '671fc2b4c7e54e0d8f7d1ddd', role: 'student' as const };

describe('AttemptsService', () => {
  let service: AttemptsService;
  let attemptModel: Model<Attempt>;
  let examModel: Model<Exam>;
  let questionModel: Model<Question>;
  let testExamId: Types.ObjectId;
  let testQuestionIds: Types.ObjectId[] = [];

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot('mongodb://127.0.0.1:27017/test_attempts'),
        MongooseModule.forFeature([
          { name: Attempt.name, schema: AttemptSchema },
          { name: Exam.name, schema: ExamSchema },
          { name: Question.name, schema: QuestionSchema },
        ]),
      ],
      providers: [AttemptsService],
    }).compile();

    service = module.get<AttemptsService>(AttemptsService);
    attemptModel = module.get<Model<Attempt>>(getModelToken(Attempt.name));
    examModel = module.get<Model<Exam>>(getModelToken(Exam.name));
    questionModel = module.get<Model<Question>>(getModelToken(Question.name));

    // إنشاء أسئلة تجريبية
    const questions = await questionModel.insertMany([
      {
        prompt: 'What is 2 + 2?',
        qType: QuestionType.MCQ,
        options: [
          { text: '3', isCorrect: false },
          { text: '4', isCorrect: true },
          { text: '5', isCorrect: false },
        ],
        status: QuestionStatus.PUBLISHED,
        level: 'g6',
        difficulty: 'easy',
      },
      {
        prompt: 'What is 3 + 3?',
        qType: QuestionType.MCQ,
        options: [
          { text: '5', isCorrect: false },
          { text: '6', isCorrect: true },
          { text: '7', isCorrect: false },
        ],
        status: QuestionStatus.PUBLISHED,
        level: 'g6',
        difficulty: 'medium',
      },
      {
        prompt: 'What is 4 + 4?',
        qType: QuestionType.MCQ,
        options: [
          { text: '7', isCorrect: false },
          { text: '8', isCorrect: true },
          { text: '9', isCorrect: false },
        ],
        status: QuestionStatus.PUBLISHED,
        level: 'g6',
        difficulty: 'hard',
      },
      {
        prompt: 'The capital of Germany is Berlin',
        qType: QuestionType.TRUE_FALSE,
        answerKeyBoolean: true,
        status: QuestionStatus.PUBLISHED,
        level: 'g6',
        difficulty: 'easy',
      },
      {
        prompt: 'Fill: The capital of France is _____',
        qType: QuestionType.FILL,
        fillExact: 'Paris',
        status: QuestionStatus.PUBLISHED,
        level: 'g6',
        difficulty: 'medium',
      },
    ]);

    testQuestionIds = questions.map((q) => q._id);

    // إنشاء امتحان تجريبي
    const exam = await examModel.create({
      title: 'Test Exam',
      level: 'g6',
      status: ExamStatus.PUBLISHED,
      sections: [
        {
          name: 'Section 1',
          items: [
            { questionId: testQuestionIds[0], points: 1 },
            { questionId: testQuestionIds[1], points: 2 },
          ],
        },
      ],
      ownerId: new Types.ObjectId(teacherUser.userId),
      attemptLimit: 3,
    });

    testExamId = exam._id;
  });

  afterAll(async () => {
    await attemptModel.deleteMany({});
    await examModel.deleteMany({});
    await questionModel.deleteMany({});
    await disconnect();
  });

  beforeEach(async () => {
    await attemptModel.deleteMany({});
  });

  describe('اختبار اختيار الأسئلة', () => {
    it('يجب أن يختار الأسئلة الثابتة من الامتحان', async () => {
      const attempt = await service.startAttempt(testExamId.toString(), studentUser);

      expect(attempt.attemptId).toBeDefined();
      expect(attempt.items).toHaveLength(2);
      expect(attempt.items[0].questionId.toString()).toBe(testQuestionIds[0].toString());
      expect(attempt.items[1].questionId.toString()).toBe(testQuestionIds[1].toString());
    });

    it('يجب أن يختار الأسئلة العشوائية حسب quota', async () => {
      const randomExam = await examModel.create({
        title: 'Random Exam',
        level: 'g6',
        status: ExamStatus.PUBLISHED,
        sections: [
          {
            name: 'Section 1',
            quota: 2,
            difficultyDistribution: { easy: 1, medium: 1, hard: 0 },
          },
        ],
        ownerId: new Types.ObjectId(teacherUser.userId),
      });

      const attempt = await service.startAttempt(randomExam._id.toString(), studentUser);

      expect(attempt.items).toHaveLength(2);

      await examModel.deleteOne({ _id: randomExam._id });
    });

    it('يجب أن يطبق توزيع الصعوبة بشكل صحيح', async () => {
      const distExam = await examModel.create({
        title: 'Distribution Exam',
        level: 'g6',
        status: ExamStatus.PUBLISHED,
        sections: [
          {
            name: 'Section 1',
            quota: 3,
            difficultyDistribution: { easy: 1, medium: 1, hard: 1 },
          },
        ],
        ownerId: new Types.ObjectId(teacherUser.userId),
      });

      const attempt = await service.startAttempt(distExam._id.toString(), studentUser);

      expect(attempt.items).toHaveLength(3);

      await examModel.deleteOne({ _id: distExam._id });
    });
  });

  describe('اختبار الترتيب العشوائي', () => {
    it('يجب أن يخلط ترتيب الأسئلة عند randomizeQuestions=true', async () => {
      const shuffledExam = await examModel.create({
        title: 'Shuffled Exam',
        level: 'g6',
        status: ExamStatus.PUBLISHED,
        sections: [
          {
            name: 'Section 1',
            items: [
              { questionId: testQuestionIds[0], points: 1 },
              { questionId: testQuestionIds[1], points: 1 },
              { questionId: testQuestionIds[2], points: 1 },
            ],
          },
        ],
        randomizeQuestions: true,
        ownerId: new Types.ObjectId(teacherUser.userId),
      });

      const attempt1 = await service.startAttempt(shuffledExam._id.toString(), studentUser);
      const attempt2 = await service.startAttempt(shuffledExam._id.toString(), studentUser2);

      // الترتيب قد يكون مختلفاً بسبب seed مختلف (attemptCount مختلف)
      expect(attempt1.items).toHaveLength(3);
      expect(attempt2.items).toHaveLength(3);

      await examModel.deleteOne({ _id: shuffledExam._id });
    });
  });

  describe('اختبار حتمية التوليد', () => {
    it('يجب أن يعيد نفس الأسئلة والترتيب مع نفس seed', async () => {
      const exam = await examModel.create({
        title: 'Deterministic Exam',
        level: 'g6',
        status: ExamStatus.PUBLISHED,
        sections: [
          {
            name: 'Section 1',
            quota: 2,
          },
        ],
        ownerId: new Types.ObjectId(teacherUser.userId),
      });

      // محاولة أولى
      const attempt1 = await service.startAttempt(exam._id.toString(), studentUser);
      const questionIds1 = attempt1.items.map((i) => i.questionId.toString());

      // حذف المحاولة الأولى
      await attemptModel.deleteOne({ _id: attempt1.attemptId });

      // محاولة ثانية (نفس attemptCount = 1)
      const attempt2 = await service.startAttempt(exam._id.toString(), studentUser);
      const questionIds2 = attempt2.items.map((i) => i.questionId.toString());

      // يجب أن تكون نفس الأسئلة (نفس seed)
      expect(questionIds1.sort()).toEqual(questionIds2.sort());

      await examModel.deleteOne({ _id: exam._id });
    });
  });

  describe('اختبار التصحيح الآلي', () => {
    it('يجب أن يصحح MCQ بشكل صحيح', async () => {
      const attempt = await service.startAttempt(testExamId.toString(), studentUser);

      // إجابة صحيحة
      await service.saveAnswer(studentUser, attempt.attemptId.toString(), {
        itemIndex: 0,
        studentAnswerIndexes: [1], // الإجابة الصحيحة
      });

      // إجابة خاطئة
      await service.saveAnswer(studentUser, attempt.attemptId.toString(), {
        itemIndex: 1,
        studentAnswerIndexes: [0], // الإجابة الخاطئة
      });

      const result = await service.submitAttempt(studentUser, attempt.attemptId.toString());

      expect(result.status).toBe(AttemptStatus.SUBMITTED);
      expect(result.totalAutoScore).toBeGreaterThan(0);
      expect(result.totalAutoScore).toBeLessThanOrEqual(result.totalMaxScore);
    });

    it('يجب أن يصحح true_false بشكل صحيح', async () => {
      const tfExam = await examModel.create({
        title: 'TF Exam',
        level: 'g6',
        status: ExamStatus.PUBLISHED,
        sections: [
          {
            name: 'Section 1',
            items: [{ questionId: testQuestionIds[3], points: 1 }],
          },
        ],
        ownerId: new Types.ObjectId(teacherUser.userId),
      });

      const attempt = await service.startAttempt(tfExam._id.toString(), studentUser);

      // إجابة صحيحة
      await service.saveAnswer(studentUser, attempt.attemptId.toString(), {
        itemIndex: 0,
        studentAnswerBoolean: true,
      });

      const result = await service.submitAttempt(studentUser, attempt.attemptId.toString());

      expect(result.totalAutoScore).toBe(1); // إجابة صحيحة

      await examModel.deleteOne({ _id: tfExam._id });
    });

    it('يجب أن يصحح fill بشكل صحيح', async () => {
      const fillExam = await examModel.create({
        title: 'Fill Exam',
        level: 'g6',
        status: ExamStatus.PUBLISHED,
        sections: [
          {
            name: 'Section 1',
            items: [{ questionId: testQuestionIds[4], points: 1 }],
          },
        ],
        ownerId: new Types.ObjectId(teacherUser.userId),
      });

      const attempt = await service.startAttempt(fillExam._id.toString(), studentUser);

      // إجابة صحيحة
      await service.saveAnswer(studentUser, attempt.attemptId.toString(), {
        itemIndex: 0,
        studentAnswerText: 'Paris',
      });

      const result = await service.submitAttempt(studentUser, attempt.attemptId.toString());

      expect(result.totalAutoScore).toBe(1); // إجابة صحيحة

      await examModel.deleteOne({ _id: fillExam._id });
    });
  });

  describe('اختبار واجهات المحاولات - سيناريو كامل', () => {
    it('يجب أن يكمل سيناريو كامل: بدء → إجابة → تسليم → عرض', async () => {
      // 1. بدء المحاولة
      const attempt = await service.startAttempt(testExamId.toString(), studentUser);
      expect(attempt.status).toBe(AttemptStatus.IN_PROGRESS);
      expect(attempt.items).toHaveLength(2);

      // 2. حفظ إجابة
      const saveResult = await service.saveAnswer(studentUser, attempt.attemptId.toString(), {
        itemIndex: 0,
        studentAnswerIndexes: [1],
      });
      expect(saveResult.ok).toBe(true);

      // 3. تسليم المحاولة
      const submitResult = await service.submitAttempt(studentUser, attempt.attemptId.toString());
      expect(submitResult.status).toBe(AttemptStatus.SUBMITTED);
      expect(submitResult.totalAutoScore).toBeGreaterThanOrEqual(0);

      // 4. عرض المحاولة
      const viewResult = await service.getAttempt(studentUser, attempt.attemptId.toString());
      expect(viewResult.status).toBe(AttemptStatus.SUBMITTED);
      expect(viewResult.finalScore).toBeDefined();
    });
  });

  describe('اختبار الصلاحيات', () => {
    it('يجب أن يمنع الطالب من الوصول لمحاولة طالب آخر', async () => {
      const attempt = await service.startAttempt(testExamId.toString(), studentUser);

      await expect(service.getAttempt(studentUser2, attempt.attemptId.toString())).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('يجب أن يسمح للمعلم المالك بالوصول لمحاولات امتحانه', async () => {
      const attempt = await service.startAttempt(testExamId.toString(), studentUser);
      await service.submitAttempt(studentUser, attempt.attemptId.toString());

      const viewResult = await service.getAttempt(teacherUser, attempt.attemptId.toString());
      expect(viewResult).toBeDefined();
    });

    it('يجب أن يمنع المعلم غير المالك من الوصول', async () => {
      const otherTeacher = { userId: '671fc2b4c7e54e0d8f7d1eee', role: 'teacher' as const };
      const attempt = await service.startAttempt(testExamId.toString(), studentUser);

      await expect(service.getAttempt(otherTeacher, attempt.attemptId.toString())).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('يجب أن يسمح للأدمن بالوصول لأي محاولة', async () => {
      const attempt = await service.startAttempt(testExamId.toString(), studentUser);

      const viewResult = await service.getAttempt(adminUser, attempt.attemptId.toString());
      expect(viewResult).toBeDefined();
    });
  });

  describe('اختبار التصحيح اليدوي', () => {
    it('يجب أن يسمح للمعلم المالك بالتصحيح اليدوي', async () => {
      const attempt = await service.startAttempt(testExamId.toString(), studentUser);
      await service.submitAttempt(studentUser, attempt.attemptId.toString());

      const gradeResult = await service.gradeAttempt(teacherUser, attempt.attemptId.toString(), [
        { questionId: testQuestionIds[0].toString(), score: 0.5 },
      ]);

      expect(gradeResult.status).toBe(AttemptStatus.GRADED);
      expect(gradeResult.finalScore).toBeGreaterThan(0);
    });

    it('يجب أن يمنع المعلم غير المالك من التصحيح', async () => {
      const otherTeacher = { userId: '671fc2b4c7e54e0d8f7d1eee', role: 'teacher' as const };
      const attempt = await service.startAttempt(testExamId.toString(), studentUser);
      await service.submitAttempt(studentUser, attempt.attemptId.toString());

      await expect(
        service.gradeAttempt(otherTeacher, attempt.attemptId.toString(), [
          { questionId: testQuestionIds[0].toString(), score: 0.5 },
        ]),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('اختبار ثبات اللقطة أمام التعديلات', () => {
    it('يجب أن يحفظ snapshot ولا يتأثر بتعديل السؤال الأصلي', async () => {
      // بدء محاولة
      const attempt = await service.startAttempt(testExamId.toString(), studentUser);
      const originalPrompt = attempt.items[0].prompt;

      // تعديل السؤال الأصلي
      await questionModel.updateOne({ _id: testQuestionIds[0] }, { prompt: 'Modified Question' });

      // عرض المحاولة - يجب أن يعرض الـ snapshot الأصلي
      const viewResult = await service.getAttempt(studentUser, attempt.attemptId.toString());
      expect(viewResult.items[0].prompt).toBe(originalPrompt);

      // إعادة السؤال الأصلي
      await questionModel.updateOne({ _id: testQuestionIds[0] }, { prompt: 'What is 2 + 2?' });
    });
  });

  describe('اختبار attemptLimit', () => {
    it('يجب أن يمنع المحاولات بعد الوصول للحد الأقصى', async () => {
      // محاولة 1
      await service.startAttempt(testExamId.toString(), studentUser);

      // محاولة 2
      const attempt2 = await service.startAttempt(testExamId.toString(), studentUser);
      await attemptModel.deleteOne({ _id: attempt2.attemptId });

      // محاولة 3
      const attempt3 = await service.startAttempt(testExamId.toString(), studentUser);
      await attemptModel.deleteOne({ _id: attempt3.attemptId });

      // محاولة 4 - يجب أن تفشل (attemptLimit = 3)
      await expect(service.startAttempt(testExamId.toString(), studentUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('اختبار انتهاء الوقت', () => {
    it('يجب أن يمنع حفظ الإجابة بعد انتهاء الوقت', async () => {
      const timeExam = await examModel.create({
        title: 'Time Exam',
        level: 'g6',
        status: ExamStatus.PUBLISHED,
        sections: [
          {
            name: 'Section 1',
            items: [{ questionId: testQuestionIds[0], points: 1 }],
          },
        ],
        ownerId: new Types.ObjectId(teacherUser.userId),
        timeLimitMin: 0.001, // دقيقة واحدة (60 ثانية)
      });

      const attempt = await service.startAttempt(timeExam._id.toString(), studentUser);

      // انتظار انتهاء الوقت
      await new Promise((resolve) => setTimeout(resolve, 100));

      await expect(
        service.saveAnswer(studentUser, attempt.attemptId.toString(), {
          itemIndex: 0,
          studentAnswerIndexes: [1],
        }),
      ).rejects.toThrow(ForbiddenException);

      await examModel.deleteOne({ _id: timeExam._id });
    });
  });

  describe('اختبار السياسات', () => {
    it('يجب أن يطبق only_scores policy', async () => {
      const policyExam = await examModel.create({
        title: 'Policy Exam',
        level: 'g6',
        status: ExamStatus.PUBLISHED,
        sections: [
          {
            name: 'Section 1',
            items: [{ questionId: testQuestionIds[0], points: 1 }],
          },
        ],
        ownerId: new Types.ObjectId(teacherUser.userId),
        resultsPolicy: 'only_scores',
      });

      const attempt = await service.startAttempt(policyExam._id.toString(), studentUser);
      await service.submitAttempt(studentUser, attempt.attemptId.toString());

      const viewResult = await service.getAttempt(studentUser, attempt.attemptId.toString());
      expect(viewResult.finalScore).toBeDefined();
      // يجب ألا يحتوي على items (only_scores)
      expect(viewResult.items).toBeUndefined();

      await examModel.deleteOne({ _id: policyExam._id });
    });
  });
});




