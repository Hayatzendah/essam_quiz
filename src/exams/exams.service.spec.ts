import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { ExamsService } from './exams.service';
import { Exam, ExamSchema } from './schemas/exam.schema';
import { Question, QuestionSchema } from '../questions/schemas/question.schema';
import { Attempt, AttemptSchema } from '../attempts/schemas/attempt.schema';
import {
  ListeningClip,
  ListeningClipSchema,
} from '../listening-clips/schemas/listening-clip.schema';
import { MediaService } from '../modules/media/media.service';
import { ExamStatusEnum } from '../common/enums';
import { disconnect } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

const teacherUser = { userId: '671fc2b4c7e54e0d8f7d1aaa', role: 'teacher' as const };
const adminUser = { userId: '671fc2b4c7e54e0d8f7d1bbb', role: 'admin' as const };

describe('ExamsService', () => {
  let service: ExamsService;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const mongoUri = mongod.getUri();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forFeature([
          { name: Exam.name, schema: ExamSchema },
          { name: Question.name, schema: QuestionSchema },
          { name: Attempt.name, schema: AttemptSchema },
          { name: ListeningClip.name, schema: ListeningClipSchema },
        ]),
      ],
      providers: [ExamsService, { provide: MediaService, useValue: {} }],
    }).compile();
    service = module.get<ExamsService>(ExamsService);
  });

  afterAll(async () => {
    await disconnect();
    await mongod.stop();
  });

  it('creates manual exam by teacher', async () => {
    const e = await service.createExam(
      {
        title: 'Manual Exam',
        examCategory: 'other',
        sections: [{ name: 'S1', items: [{ questionId: '671fc2b4c7e54e0d8f7d1999', points: 1 }] }],
      },
      teacherUser,
    );
    expect(e.id).toBeDefined();
    expect(e.status).toBe(ExamStatusEnum.DRAFT);
  });

  it('creates quota exam with difficulty distribution', async () => {
    const e = await service.createExam(
      {
        title: 'Random Exam',
        examCategory: 'other',
        sections: [
          { name: 'S1', quota: 3, difficultyDistribution: { easy: 1, medium: 1, hard: 1 } },
        ],
      },
      adminUser,
    );
    expect(e.id).toBeDefined();
  });

  it('filters exams for teacher only his own', async () => {
    const list = await service.findAll(teacherUser, {});
    expect(list.items.every((e) => String(e.ownerId) === teacherUser.userId)).toBe(true);
  });
});
