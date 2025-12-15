import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ListeningClipsController } from './listening-clips.controller';
import { ListeningClipsService } from './listening-clips.service';
import { ListeningClip, ListeningClipSchema } from './schemas/listening-clip.schema';
import { AudioConverterService } from '../common/services/audio-converter.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ListeningClip.name, schema: ListeningClipSchema },
    ]),
  ],
  controllers: [ListeningClipsController],
  providers: [ListeningClipsService, AudioConverterService],
  exports: [ListeningClipsService],
})
export class ListeningClipsModule {}

