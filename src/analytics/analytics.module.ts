import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Attempt, AttemptSchema } from '../attempts/schemas/attempt.schema';
import { Exam, ExamSchema } from '../exams/schemas/exam.schema';
import { Question, QuestionSchema } from '../questions/schemas/question.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Attempt.name, schema: AttemptSchema },
      { name: Exam.name, schema: ExamSchema },
      { name: Question.name, schema: QuestionSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}





