import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { MediaModule } from '../modules/media/media.module';

@Module({
  imports: [MediaModule],
  controllers: [UploadsController],
  providers: [],
})
export class UploadsModule {}

