import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ListeningClipsController } from './listening-clips.controller';
import { ListeningClipsService } from './listening-clips.service';
import { ListeningClip, ListeningClipSchema } from './schemas/listening-clip.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ListeningClip.name, schema: ListeningClipSchema },
    ]),
  ],
  controllers: [ListeningClipsController],
  providers: [ListeningClipsService],
  exports: [ListeningClipsService],
})
export class ListeningClipsModule {}

