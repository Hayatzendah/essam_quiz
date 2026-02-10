import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExamsService } from './exams.service';
import { ExamsController } from './exams.controller';
import { Exam, ExamSchema } from './schemas/exam.schema';
import { Question, QuestionSchema } from '../questions/schemas/question.schema';
import { Attempt, AttemptSchema } from '../attempts/schemas/attempt.schema';
import { AuthModule } from '../auth/auth.module';
import { AttemptsModule } from '../attempts/attempts.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Exam.name, schema: ExamSchema },
      { name: Question.name, schema: QuestionSchema },
      { name: Attempt.name, schema: AttemptSchema },
    ]),
    AuthModule,
    forwardRef(() => AttemptsModule),
  ],
  controllers: [ExamsController],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule {}
