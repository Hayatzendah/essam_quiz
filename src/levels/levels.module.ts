import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LevelsController } from './levels.controller';
import { LevelsService } from './levels.service';
import { Level, LevelSchema } from './schemas/level.schema';
import { Exam, ExamSchema } from '../exams/schemas/exam.schema';
import { VocabularyTopic, VocabularyTopicSchema } from '../vocabulary/schemas/vocabulary-topic.schema';
import { GrammarTopic, GrammarTopicSchema } from '../modules/grammar/schemas/grammar-topic.schema';
import { SchreibenTask, SchreibenTaskSchema } from '../modules/schreiben/schemas/schreiben-task.schema';
import { ListeningClip, ListeningClipSchema } from '../listening-clips/schemas/listening-clip.schema';
import { Question, QuestionSchema } from '../questions/schemas/question.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Level.name, schema: LevelSchema },
      { name: Exam.name, schema: ExamSchema },
      { name: VocabularyTopic.name, schema: VocabularyTopicSchema },
      { name: GrammarTopic.name, schema: GrammarTopicSchema },
      { name: SchreibenTask.name, schema: SchreibenTaskSchema },
      { name: ListeningClip.name, schema: ListeningClipSchema },
      { name: Question.name, schema: QuestionSchema },
    ]),
  ],
  controllers: [LevelsController],
  providers: [LevelsService],
  exports: [LevelsService],
})
export class LevelsModule {}
