import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { LearnGeneralQuestionsDto, LearnStateQuestionsDto } from './dto/learn-questions.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Learn')
@ApiBearerAuth('JWT-auth')
@Controller('learn')
@UseGuards(JwtAuthGuard) // JWT مطلوب لكن بدون قيود roles - متاح للطلاب
export class LearnController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get('general/questions')
  @ApiOperation({
    summary: 'Get general questions for learning (300 questions)',
    description: 'جلب الأسئلة العامة للتعلم (300 سؤال) مع الإجابات الصحيحة والشرح',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns general questions with correct answers and explanations',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'رقم الصفحة' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'عدد النتائج في الصفحة (max 100)' })
  getGeneralQuestions(@Query() dto: LearnGeneralQuestionsDto) {
    return this.questionsService.getLearnGeneralQuestions(dto);
  }

  @Get('state/questions')
  @ApiOperation({
    summary: 'Get state-specific questions for learning (160 questions - 10 per state)',
    description: 'جلب الأسئلة الولادية للتعلم (160 سؤال - 10 لكل ولاية) مع الإجابات الصحيحة والشرح',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns state-specific questions with correct answers and explanations',
  })
  @ApiQuery({ name: 'state', required: true, type: String, description: 'اسم الولاية (مثل: Berlin, Bayern, Hamburg)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'رقم الصفحة' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'عدد النتائج في الصفحة (max 100)' })
  getStateQuestions(@Query() dto: LearnStateQuestionsDto) {
    return this.questionsService.getLearnStateQuestions(dto);
  }
}

