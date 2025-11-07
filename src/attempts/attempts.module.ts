import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Attempt, AttemptSchema } from './schemas/attempt.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Attempt.name, schema: AttemptSchema }])],
  exports: [MongooseModule],
})
export class AttemptsModule {}

