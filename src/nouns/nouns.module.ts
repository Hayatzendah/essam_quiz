import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NounsController } from './nouns.controller';
import { NounsService } from './nouns.service';
import { Noun, NounSchema } from './schemas/noun.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Noun.name, schema: NounSchema }]),
  ],
  controllers: [NounsController],
  providers: [NounsService],
  exports: [NounsService],
})
export class NounsModule {}
