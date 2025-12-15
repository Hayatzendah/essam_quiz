import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { AudioConverterService } from '../common/services/audio-converter.service';

@Module({
  controllers: [UploadsController],
  providers: [AudioConverterService],
})
export class UploadsModule {}

