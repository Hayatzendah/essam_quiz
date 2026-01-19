import { Controller, Get } from '@nestjs/common';
import { 
  ExamSkillEnum, 
  QuestionStatus, 
  QuestionType, 
  QuestionDifficulty,
  ProviderEnum
} from './enums';
import { QuestionCategory } from '../questions/schemas/question.schema';

@Controller('enums')
export class EnumsController {
  @Get()
  getEnums() {
    return {
      skill: Object.values(ExamSkillEnum),
      status: Object.values(QuestionStatus),
      qType: Object.values(QuestionType),
      usageCategory: Object.values(QuestionCategory),
      questionDifficulty: Object.values(QuestionDifficulty),
      provider: Object.values(ProviderEnum),
    };
  }
}
