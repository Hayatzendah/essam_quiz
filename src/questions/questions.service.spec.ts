import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { QuestionsService } from './questions.service';
import { Question, QuestionSchema, QuestionType } from './schemas/question.schema';
import { disconnect } from 'mongoose';

describe('QuestionsService', () => {
  let service: QuestionsService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot('mongodb://127.0.0.1:27017/test_questions'),
        MongooseModule.forFeature([{ name: Question.name, schema: QuestionSchema }]),
      ],
      providers: [QuestionsService],
    }).compile();

    service = module.get<QuestionsService>(QuestionsService);
  });

  afterAll(async () => {
    await disconnect();
  });

  it('creates MCQ with at least one correct option', async () => {
    const q = await service.createQuestion({
      prompt: 'Pick primes',
      qType: QuestionType.MCQ,
      options: [
        { text: '2', isCorrect: true },
        { text: '4', isCorrect: false },
      ],
      level: 'g6',
    });
    expect(q.id).toBeDefined();
    expect(q.status).toBe('draft');
  });

  it('filters by level', async () => {
    const res = await service.findQuestions({ level: 'g6', page: '1', limit: '10' } as any);
    expect(res.items.every((i: any) => i.level === 'g6')).toBe(true);
  });

  it('updates question and increments version', async () => {
    const created = await service.createQuestion({
      prompt: 'True/False Earth is flat',
      qType: QuestionType.TRUE_FALSE,
      answerKeyBoolean: false,
    });
    const updated = await service.updateQuestion(String(created.id), {
      prompt: 'Earth is not flat',
    });
    expect(updated.version).toBe(2);
  });

  it('archives instead of hard delete by default', async () => {
    const created = await service.createQuestion({
      prompt: 'Fill capital of Egypt',
      qType: QuestionType.FILL,
      fillExact: 'Cairo',
    });
    const res = await service.removeQuestion(String(created.id));
    expect(res.archived).toBe(true);
  });
});



