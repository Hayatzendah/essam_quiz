import { PartialType } from '@nestjs/mapped-types';
import { CreateGrammarTopicDto } from './create-grammar-topic.dto';

export class UpdateGrammarTopicDto extends PartialType(CreateGrammarTopicDto) {}





