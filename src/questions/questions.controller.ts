import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QueryQuestionDto } from './dto/query-question.dto';
import { FindVocabDto } from './dto/find-vocab.dto';
import { GetGrammarQuestionsDto } from './dto/get-grammar-questions.dto';
import { CreateQuestionWithExamDto } from './dto/create-question-with-exam.dto';
import { CreateBulkQuestionsDto } from './dto/create-bulk-questions.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Questions')
@ApiBearerAuth('JWT-auth')
@Controller('questions')
export class QuestionsController {
  constructor(private readonly service: QuestionsService) {}

  @ApiOperation({ summary: 'Create a new question (teacher/admin only)' })
  @ApiResponse({ status: 201, description: 'Question created successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only teachers and admins can create questions',
  })
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  create(@Body() dto: CreateQuestionDto, @Req() req: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    return this.service.createQuestion(dto, userId);
  }

  @ApiOperation({
    summary: 'Create a new question and link it to an exam (teacher/admin only)',
    description:
      'إنشاء سؤال جديد وربطه بامتحان في section محدد. يتم تحديد correctAnswer تلقائياً من أول option مع isCorrect = true',
  })
  @ApiResponse({ status: 201, description: 'Question created and linked to exam successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed or no correct option' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only teachers and admins can create questions',
  })
  @Post('with-exam')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  createWithExam(@Body() dto: CreateQuestionWithExamDto) {
    return this.service.createQuestionWithExam(dto);
  }

  @ApiOperation({ summary: 'Create multiple questions in bulk (teacher/admin only)' })
  @ApiResponse({ status: 201, description: 'Questions created successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only teachers and admins can create questions',
  })
  @Post('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  createBulk(@Body() dto: CreateBulkQuestionsDto, @Req() req: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    return this.service.createBulkQuestions(dto.questions, userId);
  }

  @ApiOperation({ summary: 'Publish all draft questions (admin only)' })
  @ApiResponse({ status: 200, description: 'All draft questions published' })
  @Post('publish-all-drafts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  publishAllDrafts() {
    return this.service.publishAllDrafts();
  }

  // GET /questions/vocab - البحث عن أسئلة المفردات (Wortschatz)
  @ApiOperation({ summary: 'Find vocabulary questions (Wortschatz)' })
  @ApiResponse({
    status: 200,
    description: 'Returns vocabulary questions filtered by level, tags, and search',
  })
  @Get('vocab')
  @UseGuards(JwtAuthGuard)
  findVocab(@Query() dto: FindVocabDto) {
    // متاح للجميع (طلاب ومعلمين) - فقط الأسئلة المنشورة
    return this.service.findVocab(dto);
  }

  // GET /questions/grammar - البحث عن أسئلة القواعد النحوية (Grammatik)
  @ApiOperation({ summary: 'Find grammar questions (Grammatik)' })
  @ApiResponse({
    status: 200,
    description: 'Returns grammar questions filtered by level and tags',
  })
  @Get('grammar')
  @UseGuards(JwtAuthGuard)
  getGrammarQuestions(@Query() dto: GetGrammarQuestionsDto) {
    // متاح للجميع (طلاب ومعلمين) - فقط الأسئلة المنشورة
    return this.service.getGrammarQuestions(dto);
  }

  // GET /questions
  // - admin/teacher: يشوفوا جميع الأسئلة (draft/published/archived)
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  findMany(@Query() q: QueryQuestionDto, @CurrentUser() user: any) {
    // للمعلمين والأدمن: جميع الأسئلة
    return this.service.findQuestions(q);
  }

  // GET /questions/:id - الحصول على سؤال واحد
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  // PATCH /questions/:id  (admin/teacher فقط)
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  update(@Param('id') id: string, @Body() dto: UpdateQuestionDto) {
    return this.service.updateQuestion(id, dto);
  }

  // DELETE /questions/:id?hard=true  (admin/teacher فقط)
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  async remove(@Param('id') id: string, @Query('hard') hard?: string) {
    const res = await this.service.removeQuestion(id, hard === 'true');
    // 204 لو حابة بدون جسم؛ هنا بنرجّع 200 برسالة خفيفة
    return res;
  }
}
