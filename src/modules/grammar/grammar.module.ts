import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GrammarTopicsService } from './grammar-topics.service';
import { GrammarTopicsController } from './grammar-topics.controller';
import { GrammarTopic, GrammarTopicSchema } from './schemas/grammar-topic.schema';
import { Exam, ExamSchema } from '../../exams/schemas/exam.schema';
import { AttemptsModule } from '../../attempts/attempts.module';
import { QuestionsModule } from '../../questions/questions.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GrammarTopic.name, schema: GrammarTopicSchema },
      { name: Exam.name, schema: ExamSchema },
    ]),
    forwardRef(() => AttemptsModule),
    QuestionsModule,
  ],
  controllers: [GrammarTopicsController],
  providers: [GrammarTopicsService],
  exports: [GrammarTopicsService],
})
export class GrammarModule {}
