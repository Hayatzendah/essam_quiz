import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';
import { Question, QuestionSchema } from './schemas/question.schema';
import { Exam, ExamSchema } from '../exams/schemas/exam.schema';
import { GrammarTopic, GrammarTopicSchema } from '../modules/grammar/schemas/grammar-topic.schema';
import { GrammarModule } from '../modules/grammar/grammar.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Question.name, schema: QuestionSchema },
      { name: Exam.name, schema: ExamSchema },
      { name: GrammarTopic.name, schema: GrammarTopicSchema },
    ]),
    forwardRef(() => GrammarModule),
  ],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}
