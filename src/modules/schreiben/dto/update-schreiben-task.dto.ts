import { PartialType } from '@nestjs/swagger';
import { CreateSchreibenTaskDto } from './create-schreiben-task.dto';

export class UpdateSchreibenTaskDto extends PartialType(CreateSchreibenTaskDto) {}
