import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';
import { LearnController } from './learn.controller';
import { Question, QuestionSchema } from './schemas/question.schema';
import { Exam, ExamSchema } from '../exams/schemas/exam.schema';
import { Attempt, AttemptSchema } from '../attempts/schemas/attempt.schema';
import { GrammarTopic, GrammarTopicSchema } from '../modules/grammar/schemas/grammar-topic.schema';
import { GrammarModule } from '../modules/grammar/grammar.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Question.name, schema: QuestionSchema },
      { name: Exam.name, schema: ExamSchema },
      { name: Attempt.name, schema: AttemptSchema },
      { name: GrammarTopic.name, schema: GrammarTopicSchema },
    ]),
    forwardRef(() => GrammarModule),
  ],
  controllers: [QuestionsController, LearnController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}
