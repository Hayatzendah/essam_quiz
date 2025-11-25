import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { disconnect } from 'mongoose';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('E2E Happy Path', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;

  let teacherToken: string;
  let studentToken: string;
  let examId: string;
  let attemptId: string;
  let questionId1: string;
  let questionId2: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const mongoUri = mongod.getUri();
    process.env.MONGO_URI = mongoUri;
    process.env.JWT_ACCESS_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.NODE_ENV = 'test';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.enableCors({ origin: true, credentials: true });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await disconnect();
    await mongod.stop();
  });

  it('register & login teacher', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Teacher', email: 't@x.com', password: '12345678', role: 'teacher' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 't@x.com', password: '12345678' })
      .expect(201);

    teacherToken = res.body.accessToken;
    expect(teacherToken).toBeDefined();
  });

  it('register & login student', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Student', email: 's@x.com', password: '12345678', role: 'student' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 's@x.com', password: '12345678' })
      .expect(201);

    studentToken = res.body.accessToken;
    expect(studentToken).toBeDefined();
  });

  it('teacher creates questions & exam (published)', async () => {
    const q1 = await request(app.getHttpServer())
      .post('/questions')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        prompt: '2+2=?',
        qType: 'mcq',
        options: [
          { text: '4', isCorrect: true },
          { text: '3', isCorrect: false },
        ],
        status: 'published',
      })
      .expect(201);

    questionId1 = q1.body.id;

    const q2 = await request(app.getHttpServer())
      .post('/questions')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        prompt: '3+3=?',
        qType: 'mcq',
        options: [
          { text: '6', isCorrect: true },
          { text: '5', isCorrect: false },
        ],
        status: 'published',
      })
      .expect(201);

    questionId2 = q2.body.id;

    const ex = await request(app.getHttpServer())
      .post('/exams')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Math 1',
        status: 'published',
        sections: [
          {
            name: 'Section 1',
            items: [
              { questionId: questionId1, points: 1 },
              { questionId: questionId2, points: 1 },
            ],
          },
        ],
      })
      .expect(201);

    examId = ex.body.id || ex.body._id;
    expect(examId).toBeDefined();
  });

  it('student starts attempt (items present)', async () => {
    const res = await request(app.getHttpServer())
      .post('/attempts')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ examId })
      .expect(201);

    attemptId = res.body.attemptId;
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items[0]).toHaveProperty('questionId');
    expect(res.body.items[0]).toHaveProperty('prompt');
  });

  it('student answers & submits', async () => {
    // Answer first question
    await request(app.getHttpServer())
      .patch(`/attempts/${attemptId}/answer`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ itemIndex: 0, studentAnswerIndexes: [0] })
      .expect(200);

    // Answer second question
    await request(app.getHttpServer())
      .patch(`/attempts/${attemptId}/answer`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ itemIndex: 1, studentAnswerIndexes: [0] })
      .expect(200);

    // Submit
    const submitRes = await request(app.getHttpServer())
      .post(`/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({})
      .expect(200);

    expect(submitRes.body.status).toBe('submitted');
    expect(submitRes.body.totalAutoScore).toBeGreaterThanOrEqual(0);
  });

  it('teacher views attempt details', async () => {
    const details = await request(app.getHttpServer())
      .get(`/attempts/${attemptId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);

    expect(details.body.finalScore).toBeDefined();
    expect(details.body.items).toBeDefined();
  });

  it('student views own attempt', async () => {
    const me = await request(app.getHttpServer())
      .get(`/attempts/${attemptId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(me.body.items?.length).toBeGreaterThan(0);
  });
});

describe('E2E Error Scenarios', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let teacherToken: string;
  let studentToken: string;
  let examId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const mongoUri = mongod.getUri();
    process.env.MONGO_URI = mongoUri;
    process.env.JWT_ACCESS_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.NODE_ENV = 'test';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.enableCors({ origin: true, credentials: true });
    await app.init();

    // Setup users
    await request(app.getHttpServer()).post('/auth/register').send({
      name: 'Teacher2',
      email: 'teacher2@test.com',
      password: '12345678',
      role: 'teacher',
    });

    await request(app.getHttpServer()).post('/auth/register').send({
      name: 'Student2',
      email: 'student2@test.com',
      password: '12345678',
      role: 'student',
    });

    const teacherRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'teacher2@test.com', password: '12345678' });
    teacherToken = teacherRes.body.accessToken;

    const studentRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'student2@test.com', password: '12345678' });
    studentToken = studentRes.body.accessToken;

    // Create exam with attempt limit
    const q1 = await request(app.getHttpServer())
      .post('/questions')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        prompt: 'Test?',
        qType: 'mcq',
        options: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: false },
        ],
        status: 'published',
      });

    const examRes = await request(app.getHttpServer())
      .post('/exams')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Limited Exam',
        status: 'published',
        attemptLimit: 1,
        sections: [
          {
            name: 'Section 1',
            items: [{ questionId: q1.body.id, points: 1 }],
          },
        ],
      });
    examId = examRes.body.id;
  });

  afterAll(async () => {
    await app.close();
    await disconnect();
    await mongod.stop();
  });

  it('student cannot start attempt after limit reached', async () => {
    // First attempt
    const attempt1 = await request(app.getHttpServer())
      .post('/attempts')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ examId })
      .expect(201);

    // Answer and submit
    await request(app.getHttpServer())
      .patch(`/attempts/${attempt1.body.attemptId}/answer`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ itemIndex: 0, studentAnswerIndexes: [0] });

    await request(app.getHttpServer())
      .post(`/attempts/${attempt1.body.attemptId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({});

    // Second attempt should fail
    await request(app.getHttpServer())
      .post('/attempts')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ examId })
      .expect(403);
  });

  it('student cannot view another student attempt', async () => {
    // Create another student
    await request(app.getHttpServer()).post('/auth/register').send({
      name: 'Student3',
      email: 'student3@test.com',
      password: '12345678',
      role: 'student',
    });

    const student3Res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'student3@test.com', password: '12345678' });
    const student3Token = student3Res.body.accessToken;

    // Student 2 starts attempt
    const attempt = await request(app.getHttpServer())
      .post('/attempts')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ examId })
      .expect(201);

    // Student 3 tries to view Student 2's attempt
    await request(app.getHttpServer())
      .get(`/attempts/${attempt.body.attemptId}`)
      .set('Authorization', `Bearer ${student3Token}`)
      .expect(403);
  });

  it('returns 400 for invalid request body', async () => {
    await request(app.getHttpServer())
      .post('/questions')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        prompt: 'Test', // Missing qType
      })
      .expect(400);
  });

  it('returns 404 for non-existent question', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    await request(app.getHttpServer())
      .patch(`/questions/${fakeId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ prompt: 'Updated' })
      .expect(404);
  });
});
