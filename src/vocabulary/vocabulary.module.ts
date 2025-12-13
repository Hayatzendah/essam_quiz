import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VocabularyTopicsController } from './vocabulary-topics.controller';
import { VocabularyWordsController } from './vocabulary-words.controller';
import { VocabularyTopicsService } from './vocabulary-topics.service';
import { VocabularyWordsService } from './vocabulary-words.service';
import { VocabularyTopic, VocabularyTopicSchema } from './schemas/vocabulary-topic.schema';
import { VocabularyWord, VocabularyWordSchema } from './schemas/vocabulary-word.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VocabularyTopic.name, schema: VocabularyTopicSchema },
      { name: VocabularyWord.name, schema: VocabularyWordSchema },
    ]),
  ],
  controllers: [VocabularyTopicsController, VocabularyWordsController],
  providers: [VocabularyTopicsService, VocabularyWordsService],
  exports: [VocabularyTopicsService, VocabularyWordsService],
})
export class VocabularyModule {}

