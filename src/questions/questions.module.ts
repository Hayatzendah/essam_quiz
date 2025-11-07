import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Question, QuestionSchema } from './schemas/question.schema';
import { QuestionsController } from './questions.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Question.name, schema: QuestionSchema }])],
  controllers: [QuestionsController],
  exports: [MongooseModule],
})
export class QuestionsModule {}

