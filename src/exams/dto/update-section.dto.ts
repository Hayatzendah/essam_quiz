import { PartialType } from '@nestjs/swagger';
import { AddSectionDto } from './add-section.dto';

export class UpdateSectionDto extends PartialType(AddSectionDto) {}
