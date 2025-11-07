import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Exam, ExamSchema } from './schemas/exam.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Exam.name, schema: ExamSchema }])],
  exports: [MongooseModule],
})
export class ExamsModule {}
