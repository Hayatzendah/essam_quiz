import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { AudioConverterService } from '../../common/services/audio-converter.service';

@Module({
  providers: [MediaService, AudioConverterService],
  controllers: [MediaController],
  exports: [MediaService],
})
export class MediaModule {}





