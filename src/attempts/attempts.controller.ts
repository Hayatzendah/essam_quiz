import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  Logger,
  BadRequestException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { AttemptsService } from './attempts.service';
import { StartAttemptDto } from './dto/start-attempt.dto';
import { AnswerOneDto } from './dto/answer.dto';
import { SubmitAttemptSubmitDto } from './dto/submit.dto';
import { GradeAttemptDto } from './dto/grade.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreatePracticeExamDto } from '../exams/dto/create-exam.dto';

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

  // بدء محاولة تمرين (إنشاء Exam تمرين وبدء Attempt في خطوة واحدة - للطلاب)
  @Post('practice')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @ApiOperation({
    summary: 'Create practice exam and start attempt (for students)',
    description: 'إنشاء Exam تمرين وبدء Attempt في خطوة واحدة - للاستخدام في قسم القواعد والتمارين',
  })
  @ApiResponse({ status: 201, description: 'Practice attempt started successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async startPractice(@Body() dto: CreatePracticeExamDto, @Req() req: any) {
    this.logger.log(
      `[POST /attempts/practice] Request received - userId: ${req.user?.userId}, role: ${req.user?.role}, sections: ${dto?.sections?.length || 0}`,
    );
    
    try {
      const result = await this.service.startPracticeAttempt(dto, req.user);
      const attemptId =
        (result as any)?.attemptId || (result as any)?._id || (result as any)?.id || 'unknown';
      const itemsCount = (result as any)?.items?.length || 0;
      
      this.logger.log(
        `[POST /attempts/practice] Practice attempt started successfully - attemptId: ${attemptId}, itemsCount: ${itemsCount}`,
      );
      
      if (itemsCount === 0) {
        this.logger.error(`[POST /attempts/practice] WARNING: Attempt created with 0 items!`);
      }
      
      return result;
    } catch (error: any) {
      this.logger.error(
        `[POST /attempts/practice] Error starting practice attempt - error: ${error.message}, stack: ${error.stack}`,
      );
      throw error;
    }
  }

  // بدء محاولة امتحان (طالب فقط)
  // Body: { "examId": "...", "mode": "exam" | "training" }
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @ApiOperation({
    summary: 'Start attempt on exam',
    description:
      'بدء محاولة على امتحان - يستخدم منطق AttemptsModule لاختيار الأسئلة وإنشاء Attempt جديد',
  })
  @ApiResponse({ status: 201, description: 'Attempt started successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - exam not found, not published, or attempt limit reached',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async start(@Body() dto: StartAttemptDto, @Req() req: any) {
    const mode = dto.mode || 'exam';
    this.logger.log(
      `[POST /attempts] 🔍 Request received - examId: ${dto?.examId}, mode: ${mode}, userId: ${req.user?.userId}, role: ${req.user?.role}`,
    );
    this.logger.log(
      `[POST /attempts] 🔍 Request details - examId type: ${typeof dto?.examId}, examId value: "${dto?.examId}", examId length: ${dto?.examId?.length}`,
    );
    this.logger.debug(
      `[POST /attempts] Full request body: ${JSON.stringify(dto)}, user: ${JSON.stringify({ userId: req.user?.userId, role: req.user?.role })}`,
    );
    
    if (!dto?.examId) {
      this.logger.error(
        `[POST /attempts] Missing examId in request body. Received: ${JSON.stringify(dto)}`,
      );
      throw new BadRequestException({
        code: 'MISSING_EXAM_ID',
        message: 'examId is required in request body',
        received: dto,
      });
    }

    try {
      // استخدام startAttempt في كلا الحالتين (exam و training)
      // يمكن توسيع هذا لاحقاً لإضافة معالجة مختلفة للـ training mode
      const result = await this.service.startAttempt(dto.examId, req.user);
      const attemptId =
        (result as any)?._id || (result as any)?.id || (result as any)?.attemptId || 'unknown';
      const itemsCount = (result as any)?.items?.length || 0;
      
      this.logger.log(
        `[POST /attempts] Attempt created successfully - examId: ${dto.examId}, mode: ${mode}, attemptId: ${attemptId}, itemsCount: ${itemsCount}`,
      );
      
      if (itemsCount === 0) {
        this.logger.error(
          `[POST /attempts] WARNING: Attempt created with 0 items! Response: ${JSON.stringify({
          attemptId,
          examId: result?.examId,
          status: result?.status,
          itemsCount: result?.items?.length || 0,
          })}`,
        );
      } else {
        this.logger.log(
          `[POST /attempts] Response contains ${itemsCount} items. First item: ${JSON.stringify({
          questionId: result?.items?.[0]?.questionId,
          qType: (result?.items?.[0] as any)?.qType,
          hasPrompt: !!(result?.items?.[0] as any)?.promptSnapshot,
          hasOptions: !!(result?.items?.[0] as any)?.optionsText,
          })}`,
        );
      }
      
      // إرجاع attemptId + items + timeLimitMin
      // result يحتوي بالفعل على جميع الحقول المطلوبة
      return result;
    } catch (error: any) {
      this.logger.error(
        `[POST /attempts] Error creating attempt - examId: ${dto.examId}, mode: ${mode}, error: ${error.message}`,
      );
      this.logger.error(
        `[POST /attempts] Error details - code: ${error?.response?.code || error?.code || 'UNKNOWN'}, message: ${error?.response?.message || error?.message || 'Unknown error'}`,
      );
      this.logger.error(
        `[POST /attempts] Error stack: ${error.stack}`,
      );
      
      // إذا كان الخطأ من class-validator (validation error)
      if (error?.response?.message && Array.isArray(error.response.message)) {
        this.logger.error(
          `[POST /attempts] Validation errors: ${JSON.stringify(error.response.message)}`,
        );
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          errors: error.response.message,
          received: dto,
        });
      }
      
      // إعادة رمي الخطأ كما هو (BadRequestException أو ForbiddenException)
      throw error;
    }
  }

  // حفظ إجابة أثناء المحاولة (طالب فقط)
  // يدعم: PATCH /attempts/:attemptId/answer (مع itemIndex في body)
  // و: PATCH /attempts/:attemptId/answer/:itemIndex (مع itemIndex في URL)
  
  // Route with itemIndex in URL (must come before the route without it)
  @Patch(':attemptId/answer/:itemIndex')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  async answerWithIndex(
    @Param('attemptId') attemptId: string,
    @Param('itemIndex') itemIndexFromUrl: string,
    @Body() dto: AnswerOneDto,
    @Req() req: any,
  ) {
    // Parse itemIndex from URL and use it
    const parsedIndex = parseInt(itemIndexFromUrl, 10);
    if (!isNaN(parsedIndex)) {
      dto.itemIndex = parsedIndex;
    }
    
    this.logger.log(
      `[PATCH /attempts/${attemptId}/answer/${itemIndexFromUrl}] Request received - itemIndex: ${dto?.itemIndex}, questionId: ${dto?.questionId}, userId: ${req.user?.userId}`,
    );
    this.logger.debug(
      `[PATCH /attempts/${attemptId}/answer/${itemIndexFromUrl}] Request body: ${JSON.stringify(dto)}`,
    );
    
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
      
      this.logger.log(
        `[PATCH /attempts/${attemptId}/answer/${itemIndexFromUrl}] Answer saved successfully`,
      );
      return result;
    } catch (error: any) {
      this.logger.error(
        `[PATCH /attempts/${attemptId}/answer/${itemIndexFromUrl}] Error saving answer - error: ${error.message}, stack: ${error.stack}`,
      );
      throw error;
    }
  }

  // Route without itemIndex in URL (itemIndex must be in body)
  @Patch(':attemptId/answer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  async answer(@Param('attemptId') attemptId: string, @Body() dto: AnswerOneDto, @Req() req: any) {
    this.logger.log(
      `[PATCH /attempts/${attemptId}/answer] Request received - itemIndex: ${dto?.itemIndex}, questionId: ${dto?.questionId}, userId: ${req.user?.userId}`,
    );
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
      this.logger.error(
        `[PATCH /attempts/${attemptId}/answer] Error saving answer - error: ${error.message}, stack: ${error.stack}`,
      );
      throw error;
    }
  }

  // تسليم المحاولة (طالب فقط)
  @Post(':attemptId/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  submit(@Param('attemptId') attemptId: string, @Body() body: SubmitAttemptSubmitDto, @Req() req: any) {
    this.logger.log(
      `[POST /attempts/${attemptId}/submit] Request received - userId: ${req.user?.userId}, answersCount: ${body?.answers?.length || 0}`,
    );
    return this.service.submitAttempt(req.user, attemptId, body.answers);
  }

  // إدخال درجات يدوية (معلم مالك أو أدمن)
  @Post(':attemptId/grade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  grade(@Param('attemptId') attemptId: string, @Body() dto: GradeAttemptDto, @Req() req: any) {
    return this.service.gradeAttempt(req.user, attemptId, dto.items);
  }

  // رفع تسجيل صوت الطالب
  @Post(':attemptId/items/:itemId/recording')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'recordings'),
        filename: (req, file, cb) => {
          const timestamp = Date.now();
          const random = Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname) || '.webm';
          cb(null, `recording-${timestamp}-${random}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (req, file, callback) => {
        if (!/^audio\//.test(file.mimetype)) {
          return callback(
            new BadRequestException('Only audio files are allowed') as any,
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  @ApiOperation({
    summary: 'Upload student audio recording for an attempt item',
    description: 'رفع تسجيل صوتي لإجابة الطالب على سؤال معين في المحاولة',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Recording uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid file or item not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the owner of the attempt' })
  @ApiResponse({ status: 404, description: 'Attempt or item not found' })
  async uploadRecording(
    @Param('attemptId') attemptId: string,
    @Param('itemId') itemId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No audio file uploaded');
    }

    console.log('Saved student recording at', file.path);

    const audioUrl = `/uploads/recordings/${file.filename}`;

    await this.service.attachStudentRecording(req.user, attemptId, itemId, {
      url: audioUrl,
      mime: file.mimetype,
    });

    return { audioUrl, mime: file.mimetype };
  }

  // عرض المحاولة (الطالب مالكها | المعلم المالك للامتحان | الأدمن)
  @Get(':attemptId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student', 'teacher', 'admin')
  view(@Param('attemptId') attemptId: string, @Req() req: any) {
    return this.service.getAttempt(req.user, attemptId);
  }
}
