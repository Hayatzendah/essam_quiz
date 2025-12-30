import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { MediaModule } from '../modules/media/media.module';
import { AudioConverterService } from '../common/services/audio-converter.service';

@Module({
  imports: [MediaModule],
  controllers: [UploadsController],
  providers: [AudioConverterService],
})
export class UploadsModule {}

