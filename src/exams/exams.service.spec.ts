import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { ExamsService } from './exams.service';
import { Exam, ExamSchema, ExamStatus } from './schemas/exam.schema';
import { disconnect } from 'mongoose';

const teacherUser = { userId: '671fc2b4c7e54e0d8f7d1aaa', role: 'teacher' as const };
const adminUser = { userId: '671fc2b4c7e54e0d8f7d1bbb', role: 'admin' as const };
const studentUser = { userId: '671fc2b4c7e54e0d8f7d1ccc', role: 'student' as const };

describe('ExamsService', () => {
  let service: ExamsService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot('mongodb://127.0.0.1:27017/test_exams'),
        MongooseModule.forFeature([{ name: Exam.name, schema: ExamSchema }]),
      ],
      providers: [ExamsService],
    }).compile();
    service = module.get<ExamsService>(ExamsService);
  });

  afterAll(async () => {
    await disconnect();
  });

  it('creates manual exam by teacher', async () => {
    const e = await service.createExam(
      {
        title: 'Manual Exam',
        sections: [{ name: 'S1', items: [{ questionId: '671fc2b4c7e54e0d8f7d1999', points: 1 }] }],
      },
      teacherUser,
    );
    expect(e.id).toBeDefined();
    expect(e.status).toBe(ExamStatus.DRAFT);
  });

  it('creates quota exam with difficulty distribution', async () => {
    const e = await service.createExam(
      {
        title: 'Random Exam',
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




