import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AttemptsController } from './attempts.controller';
import { AttemptsService } from './attempts.service';
import { AttemptsCronService } from './attempts-cron.service';
import { Attempt, AttemptSchema } from './schemas/attempt.schema';
import { Exam, ExamSchema } from '../exams/schemas/exam.schema';
import { Question, QuestionSchema } from '../questions/schemas/question.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../modules/media/media.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Attempt.name, schema: AttemptSchema },
      { name: Exam.name, schema: ExamSchema },
      { name: Question.name, schema: QuestionSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuthModule,
    MediaModule,
  ],
  controllers: [AttemptsController],
  providers: [AttemptsService, AttemptsCronService],
  exports: [AttemptsService],
})
export class AttemptsModule {}
