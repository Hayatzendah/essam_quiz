import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GrammarTopicsService } from './grammar-topics.service';
import { GrammarTopicsController } from './grammar-topics.controller';
import { GrammarTopic, GrammarTopicSchema } from './schemas/grammar-topic.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: GrammarTopic.name, schema: GrammarTopicSchema }]),
  ],
  controllers: [GrammarTopicsController],
  providers: [GrammarTopicsService],
  exports: [GrammarTopicsService],
})
export class GrammarModule {}

