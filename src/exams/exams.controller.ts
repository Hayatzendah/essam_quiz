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
  Logger,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ExamsService } from './exams.service';
import { CreateExamDto, CreatePracticeExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { QueryExamDto } from './dto/query-exam.dto';
import { AssignExamDto } from './dto/assign-exam.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AttemptsService } from '../attempts/attempts.service';

@ApiTags('Exams')
@ApiBearerAuth('JWT-auth')
@Controller('exams')
export class ExamsController {
  private readonly logger = new Logger(ExamsController.name);

  constructor(
    private readonly service: ExamsService,
    @Inject(forwardRef(() => AttemptsService))
    private readonly attemptsService: AttemptsService,
  ) {}

  // إنشاء امتحان (admin/teacher فقط)
  // ⚠️ للطلاب: استخدم POST /attempts/practice لبدء محاولة تمرين
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Create exam (admin/teacher only)',
    description:
      'إنشاء امتحان جديد - يتطلب role: admin أو teacher. للطلاب: استخدم POST /attempts/practice لبدء محاولة تمرين',
  })
  @ApiResponse({ status: 201, description: 'Exam created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - requires admin or teacher role. Students should use POST /attempts/practice',
  })
  create(@Body() dto: CreateExamDto, @Req() req: any) {
    this.logger.log(
      `[POST /exams] Request received - userId: ${req.user?.userId}, role: ${req.user?.role}, user object: ${JSON.stringify(req.user)}`,
    );

    // إذا كان المستخدم طالباً، أرسل رسالة خطأ واضحة
    if (req.user?.role === 'student') {
      this.logger.warn(
        `[POST /exams] Student attempted to create exam - userId: ${req.user?.userId}`,
      );
      throw new ForbiddenException({
        status: 'error',
        code: 403,
        message:
          'ليس لديك صلاحية لإنشاء امتحانات. استخدم POST /exams/{examId}/attempts لبدء محاولة على exam موجود، أو POST /grammar/topics/{slug}/attempts للتمارين النحوية',
        hint: 'Students cannot create exams. Use POST /exams/{examId}/attempts to start an attempt on an existing exam, or POST /grammar/topics/{slug}/attempts for grammar exercises.',
      });
    }

    return this.service.createExam(dto, req.user);
  }

  // إنشاء امتحان تمرين ديناميكي (admin/teacher فقط)
  // ⚠️ للطلاب: استخدم POST /attempts/practice لبدء محاولة تمرين
  @Post('practice')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Create practice exam (admin/teacher only)',
    description:
      'إنشاء امتحان تمرين ديناميكي - يتطلب role: admin أو teacher. للطلاب: استخدم POST /attempts/practice لبدء محاولة تمرين',
  })
  @ApiResponse({ status: 201, description: 'Practice exam created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - requires admin or teacher role. Students should use POST /attempts/practice',
  })
  createPracticeExam(@Body() dto: CreatePracticeExamDto, @Req() req: any) {
    this.logger.log(
      `[POST /exams/practice] Request received - userId: ${req.user?.userId}, role: ${req.user?.role}, sections: ${dto?.sections?.length || 0}`,
    );

    // إذا كان المستخدم طالباً، أرسل رسالة خطأ واضحة
    if (req.user?.role === 'student') {
      this.logger.warn(
        `[POST /exams/practice] Student attempted to create practice exam - userId: ${req.user?.userId}`,
      );
      throw new ForbiddenException({
        status: 'error',
        code: 403,
        message:
          'ليس لديك صلاحية لإنشاء امتحانات. استخدم POST /attempts/practice لبدء محاولة تمرين',
        hint: 'Students cannot create exams. Use POST /attempts/practice to start a practice attempt instead.',
      });
    }

    return this.service.createPracticeExam(dto, req.user);
  }

  // قائمة الامتحانات
  // - admin: جميع الامتحانات
  // - teacher: امتحاناته فقط
  // - student: الامتحانات المنشورة المتاحة
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher', 'student')
  findAll(@Query() q: QueryExamDto, @Req() req: any) {
    this.logger.log(
      `[GET /exams] Request received - userId: ${req.user?.userId}, role: ${req.user?.role}, user object: ${JSON.stringify(req.user)}`,
    );
    return this.service.findAll(req.user, q);
  }

  // قائمة الامتحانات المتاحة للطلاب
  @Get('available')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  findAvailable(@Query() q: QueryExamDto, @Req() req: any) {
    return this.service.findAvailableForStudent(req.user, q);
  }

  // قائمة الامتحانات المنشورة للطلاب (Public endpoint)
  // Public endpoint - لا يحتاج JWT
  @Get('public')
  @ApiOperation({
    summary: 'Get published exams for students',
    description: 'عرض قائمة الامتحانات المنشورة فقط - Public endpoint (لا يحتاج JWT)',
  })
  @ApiResponse({ status: 200, description: 'List of published exams' })
  async findPublic(@Query() q: QueryExamDto) {
    this.logger.log(
      `[GET /exams/public] Request received - level: ${q?.level}, provider: ${q?.provider}, page: ${(q as any)?.page}, limit: ${(q as any)?.limit}`,
    );
    try {
      const result = await this.service.findPublicExams(q);
      this.logger.log(`[GET /exams/public] Success - found ${result.count} exams`);
      return result;
    } catch (error: any) {
      this.logger.error(`[GET /exams/public] Error: ${error.message}`, error.stack);
      throw error;
    }
  }

  // تفاصيل امتحان معين للطالب (Public endpoint)
  // Public endpoint - لا يحتاج JWT
  @Get(':examId/public')
  @ApiOperation({
    summary: 'Get exam details for students',
    description:
      'عرض تفاصيل الامتحان المتاحة للطالب - لا يعرض الأسئلة، فقط هيكل الأقسام - Public endpoint (لا يحتاج JWT)',
  })
  @ApiResponse({ status: 200, description: 'Exam details' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  findPublicById(@Param('examId') examId: string) {
    this.logger.log(`[GET /exams/${examId}/public] Request received`);
    return this.service.findPublicExamById(examId);
  }

  // تفاصيل الامتحان
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher', 'student')
  findById(@Param('id') id: string, @Req() req: any) {
    return this.service.findById(id, req.user);
  }

  // تحديث الامتحان (المالك أو الأدمن)
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  update(@Param('id') id: string, @Body() dto: UpdateExamDto, @Req() req: any) {
    return this.service.updateExam(id, dto, req.user);
  }

  // حذف امتحان (المالك أو الأدمن)
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  remove(@Param('id') id: string, @Query('hard') hard?: string, @Req() req?: any) {
    this.logger.log(
      `DELETE /exams/${id} - hard: ${hard}, user: ${req?.user?.userId}, role: ${req?.user?.role}`,
    );
    return this.service.removeExam(id, req?.user, hard === 'true');
  }

  // إسناد امتحان (اختياري) - يجب أن يكون بعد DELETE لتجنب التعارض
  @Post(':id/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  assign(@Param('id') id: string, @Body() dto: AssignExamDto, @Req() req: any) {
    return this.service.assignExam(id, dto, req.user);
  }

  // بدء محاولة على exam موجود (للطلاب)
  @Post(':id/attempts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @ApiOperation({
    summary: 'Start attempt on existing exam (for students)',
    description:
      'بدء محاولة على امتحان موجود - للطلاب فقط. Exam يجب أن يكون منشور (published) ومتاح للطلاب',
  })
  @ApiResponse({ status: 201, description: 'Attempt started successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - exam not found, not published, or attempt limit reached',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async startAttempt(@Param('id') examId: string, @Req() req: any) {
    this.logger.log(
      `[POST /exams/${examId}/attempts] Request received - userId: ${req.user?.userId}, role: ${req.user?.role}`,
    );
    return this.attemptsService.startAttempt(examId, req.user);
  }
}
