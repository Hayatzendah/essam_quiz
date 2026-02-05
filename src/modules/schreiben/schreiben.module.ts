import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SchreibenTasksController } from './schreiben-tasks.controller';
import { SchreibenTasksService } from './schreiben-tasks.service';
import {
  SchreibenTask,
  SchreibenTaskSchema,
} from './schemas/schreiben-task.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SchreibenTask.name, schema: SchreibenTaskSchema },
    ]),
  ],
  controllers: [SchreibenTasksController],
  providers: [SchreibenTasksService],
  exports: [SchreibenTasksService],
})
export class SchreibenModule {}
