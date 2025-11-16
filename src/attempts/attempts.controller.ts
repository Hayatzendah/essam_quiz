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
      const itemsCount = (result as any)?.items?.length || 0;
      
      this.logger.log(`[POST /attempts] Attempt created successfully - examId: ${dto.examId}, attemptId: ${attemptId}, itemsCount: ${itemsCount}`);
      
      if (itemsCount === 0) {
        this.logger.error(`[POST /attempts] WARNING: Attempt created with 0 items! Response: ${JSON.stringify({
          attemptId,
          examId: result?.examId,
          status: result?.status,
          itemsCount: result?.items?.length || 0,
        })}`);
      } else {
        this.logger.log(`[POST /attempts] Response contains ${itemsCount} items. First item: ${JSON.stringify({
          questionId: result?.items?.[0]?.questionId,
          qType: result?.items?.[0]?.qType,
          hasPrompt: !!result?.items?.[0]?.prompt,
          hasOptions: !!result?.items?.[0]?.options,
        })}`);
      }
      
      return result;
    } catch (error: any) {
      this.logger.error(`[POST /attempts] Error creating attempt - examId: ${dto.examId}, error: ${error.message}, stack: ${error.stack}`);
      // إعادة رمي الخطأ كما هو (BadRequestException أو ForbiddenException)
      throw error;
    }
  }

  // حفظ إجابة أثناء المحاولة (طالب فقط)
  // يدعم: PATCH /attempts/:attemptId/answer (مع itemIndex في body)
  // و: PATCH /attempts/:attemptId/answer/:itemIndex (مع itemIndex في URL)
  @Patch(':attemptId/answer/:itemIndex?')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  async answer(
    @Param('attemptId') attemptId: string,
    @Param('itemIndex') itemIndexFromUrl: string | undefined,
    @Body() dto: AnswerOneDto,
    @Req() req: any
  ) {
    // إذا كان itemIndex في URL، نستخدمه
    if (itemIndexFromUrl !== undefined) {
      const parsedIndex = parseInt(itemIndexFromUrl, 10);
      if (!isNaN(parsedIndex)) {
        dto.itemIndex = parsedIndex;
      }
    }
    
    this.logger.log(`[PATCH /attempts/${attemptId}/answer${itemIndexFromUrl ? `/${itemIndexFromUrl}` : ''}] Request received - itemIndex: ${dto?.itemIndex}, questionId: ${dto?.questionId}, userId: ${req.user?.userId}`);
    this.logger.debug(`[PATCH /attempts/${attemptId}/answer] Request body: ${JSON.stringify(dto)}`);
    
    try {
      const result = await this.service.saveAnswer(req.user, attemptId, {
        itemIndex: dto.itemIndex,
        questionId: dto.questionId,
        studentAnswerIndexes: dto.studentAnswerIndexes,
        studentAnswerText: dto.studentAnswerText,
        studentAnswerBoolean: dto.studentAnswerBoolean,
        studentAnswerMatch: dto.studentAnswerMatch,
        studentAnswerReorder: dto.studentAnswerReorder,
        studentAnswerAudioKey: dto.studentAnswerAudioKey,
      });
      
      this.logger.log(`[PATCH /attempts/${attemptId}/answer] Answer saved successfully`);
      return result;
    } catch (error: any) {
      this.logger.error(`[PATCH /attempts/${attemptId}/answer] Error saving answer - error: ${error.message}, stack: ${error.stack}`);
      throw error;
    }
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



