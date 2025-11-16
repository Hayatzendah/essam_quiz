import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards, Logger, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AttemptsService } from './attempts.service';
import { StartAttemptDto } from './dto/start-attempt.dto';
import { AnswerOneDto } from './dto/answer.dto';
import { SubmitAttemptDto } from './dto/submit.dto';
import { GradeAttemptDto } from './dto/grade.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Attempts')
@ApiBearerAuth('JWT-auth')
@Controller('attempts')
export class AttemptsController {
  private readonly logger = new Logger(AttemptsController.name);

  constructor(private readonly service: AttemptsService) {}

  // قائمة محاولات الطالب
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  findMyAttempts(@Req() req: any, @Query('examId') examId?: string) {
    return this.service.findByStudent(req.user, examId);
  }

  // بدء محاولة امتحان (طالب فقط)
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  async start(@Body() dto: StartAttemptDto, @Req() req: any) {
    this.logger.log(`[POST /attempts] Request received - examId: ${dto?.examId}, userId: ${req.user?.userId}, role: ${req.user?.role}`);
    
    if (!dto?.examId) {
      this.logger.error(`[POST /attempts] Missing examId in request body. Received: ${JSON.stringify(dto)}`);
      throw new BadRequestException({
        code: 'MISSING_EXAM_ID',
        message: 'examId is required in request body',
        received: dto,
      });
    }

    try {
      const result = await this.service.startAttempt(dto.examId, req.user);
      const attemptId = (result as any)?._id || (result as any)?.id || (result as any)?.attemptId || 'unknown';
      this.logger.log(`[POST /attempts] Attempt created successfully - examId: ${dto.examId}, attemptId: ${attemptId}`);
      return result;
    } catch (error: any) {
      this.logger.error(`[POST /attempts] Error creating attempt - examId: ${dto.examId}, error: ${error.message}, stack: ${error.stack}`);
      // إعادة رمي الخطأ كما هو (BadRequestException أو ForbiddenException)
      throw error;
    }
  }

  // حفظ إجابة أثناء المحاولة (طالب فقط)
  @Patch(':attemptId/answer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  answer(@Param('attemptId') attemptId: string, @Body() dto: AnswerOneDto, @Req() req: any) {
    return this.service.saveAnswer(req.user, attemptId, {
      itemIndex: dto.itemIndex,
      questionId: dto.questionId,
      studentAnswerIndexes: dto.studentAnswerIndexes,
      studentAnswerText: dto.studentAnswerText,
      studentAnswerBoolean: dto.studentAnswerBoolean,
      studentAnswerMatch: dto.studentAnswerMatch,
      studentAnswerReorder: dto.studentAnswerReorder,
      studentAnswerAudioKey: dto.studentAnswerAudioKey,
    });
  }

  // تسليم المحاولة (طالب فقط)
  @Post(':attemptId/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  submit(@Param('attemptId') attemptId: string, @Body() _dto: SubmitAttemptDto, @Req() req: any) {
    return this.service.submitAttempt(req.user, attemptId);
  }

  // إدخال درجات يدوية (معلم مالك أو أدمن)
  @Post(':attemptId/grade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher','admin')
  grade(@Param('attemptId') attemptId: string, @Body() dto: GradeAttemptDto, @Req() req: any) {
    return this.service.gradeAttempt(req.user, attemptId, dto.items);
  }

  // عرض المحاولة (الطالب مالكها | المعلم المالك للامتحان | الأدمن)
  @Get(':attemptId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student','teacher','admin')
  view(@Param('attemptId') attemptId: string, @Req() req: any) {
    return this.service.getAttempt(req.user, attemptId);
  }
}



