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
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ExamsService } from './exams.service';
import { CreateExamDto, CreatePracticeExamDto } from './dto/create-exam.dto';
import { CreatePracticeModeDto } from './dto/create-practice-mode.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { QueryExamDto } from './dto/query-exam.dto';
import { AssignExamDto } from './dto/assign-exam.dto';
import { StartLebenExamDto } from './dto/start-leben-exam.dto';
import { UpdateSectionAudioDto } from './dto/update-section-audio.dto';
import { AddSectionDto } from './dto/add-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { AddQuestionToSectionDto, ReorderSectionQuestionsDto } from './dto/section-question.dto';
import { UpdateQuestionPointsDto } from './dto/update-question-points.dto';
import { BulkCreateSectionQuestionsDto } from './dto/bulk-section-questions.dto';
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

  // إنشاء امتحان تمرين ديناميكي
  // - admin/teacher: يمكنهم إنشاء practice exam عادي
  // - students: يمكنهم استخدام mode=general أو mode=state للتعلم مع الإجابات
  @Post('practice')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Create practice exam or get practice questions for learning',
    description:
      'إنشاء امتحان تمرين ديناميكي - admin/teacher: يمكنهم إنشاء practice exam عادي. students: يمكنهم استخدام mode=general أو mode=state للتعلم مع الإجابات الصحيحة',
  })
  @ApiResponse({ status: 201, description: 'Practice exam created successfully or practice questions returned' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'No questions found (for learn mode)' })
  createPracticeExam(@Body() dto: CreatePracticeExamDto | CreatePracticeModeDto, @Req() req: any) {
    this.logger.log(
      `[POST /exams/practice] Request received - userId: ${req.user?.userId}, role: ${req.user?.role}, hasMode: ${(dto as any).mode ? 'yes' : 'no'}`,
    );

    // إذا كان body يحتوي على mode، استخدم learn mode (للطلاب)
    if ((dto as any).mode) {
      this.logger.log(
        `[POST /exams/practice] Learn mode requested - mode: ${(dto as any).mode}, state: ${(dto as any).state}`,
      );
      return this.service.createPracticeModeExam(dto as CreatePracticeModeDto, req.user);
    }

    // إذا لم يكن mode موجود، تحقق من roles (admin/teacher فقط)
    if (req.user?.role !== 'admin' && req.user?.role !== 'teacher') {
      throw new ForbiddenException({
        status: 'error',
        code: 403,
        message:
          'للطلاب: استخدم mode=general أو mode=state في body للحصول على أسئلة التعلم مع الإجابات. مثال: {"mode": "general"} أو {"mode": "state", "state": "Berlin"}',
        hint: 'For students: Use mode=general or mode=state in body to get practice questions with answers. Example: {"mode": "general"} or {"mode": "state", "state": "Berlin"}',
      });
    }

    // admin/teacher: إنشاء practice exam عادي
    return this.service.createPracticeExam(dto as CreatePracticeExamDto, req.user);
  }

  // Practice/Learn Mode للطلاب - يرجع الأسئلة مع الإجابات الصحيحة
  @Post('practice/mode')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get practice questions for learning (students allowed)',
    description:
      'جلب أسئلة التمرين للتعلم - متاح للطلاب. يرجع الأسئلة مع الإجابات الصحيحة والشرح. يدعم general (300 سؤال) و state (160 سؤال حسب الولاية)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns practice questions with correct answers and explanations',
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'No questions found' })
  createPracticeMode(@Body() dto: CreatePracticeModeDto, @Req() req: any) {
    this.logger.log(
      `[POST /exams/practice/mode] Request received - mode: ${dto.mode}, state: ${dto.state}, userId: ${req.user?.userId}, role: ${req.user?.role}`,
    );
    return this.service.createPracticeModeExam(dto, req.user);
  }

  // قائمة مزوّدي الامتحانات المتاحة + مستوياتهم
  @Get('providers')
  @ApiOperation({
    summary: 'Get exam providers and their available levels',
    description: 'إرجاع قائمة بالـ providers الموجود لهم امتحانات منشورة من نوع provider_exam مع المستويات المتاحة لكل provider',
  })
  @ApiResponse({ status: 200, description: 'List of providers with their levels' })
  getProviders() {
    this.logger.log(`[GET /exams/providers] Request received`);
    return this.service.getProviders();
  }

  @Get('provider-skills')
  @ApiOperation({
    summary: 'Get available skills for a provider (with exam counts)',
    description: 'إرجاع المهارات المتاحة مع عدد الامتحانات لكل مهارة - لعرض أقسام مثل Hören, Lesen, Schreiben...',
  })
  @ApiResponse({ status: 200, description: 'List of skills with exam counts' })
  getProviderSkills(
    @Query('provider') provider: string,
    @Query('level') level?: string,
  ) {
    this.logger.log(`[GET /exams/provider-skills] provider=${provider}, level=${level}`);
    return this.service.getProviderSkills(provider, level);
  }

  // قائمة الامتحانات
  // - admin: جميع الامتحانات
  // - teacher: امتحاناته فقط
  // - student: الامتحانات المنشورة المتاحة
  // - يمكن استخدام ?simple=true للحصول على قائمة مبسطة (_id, title, level فقط)
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher', 'student')
  findAll(@Query() q: QueryExamDto & { simple?: string }, @Req() req: any) {
    this.logger.log(
      `[GET /exams] Request received - userId: ${req.user?.userId}, role: ${req.user?.role}, simple: ${q?.simple}`,
    );
    
    // إذا كان simple=true، أرجع قائمة مبسطة
    if (q?.simple === 'true') {
      return this.service.findAllSimple(req.user, q);
    }
    
    return this.service.findAll(req.user, q);
  }

  // قائمة الامتحانات المتاحة للطلاب
  @Get('available')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  findAvailable(@Query() q: QueryExamDto, @Req() req: any) {
    return this.service.findAvailableForStudent(req.user, q);
  }

  // 🔍 DEBUG ENDPOINT - فحص بنية الامتحان
  @Get('debug/:id')
  @ApiOperation({
    summary: 'Debug exam structure',
    description: 'فحص بنية الامتحان وتشخيص مشكلة "No questions available" - Public endpoint للتشخيص'
  })
  @ApiResponse({ status: 200, description: 'Debug info returned' })
  async debugExam(@Param('id') id: string) {
    this.logger.log(`[GET /exams/debug/${id}] Debug request received`);
    return this.service.debugExamStructure(id);
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

  // إيجاد جميع الامتحانات التي sections فارغة (admin/teacher)
  // ⚠️ يجب أن يكون قبل جميع الـ routes الديناميكية (:id, :examId) لتجنب التعارض
  @Get('empty-sections')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Find all exams with empty sections (admin/teacher)',
    description: 'إيجاد جميع الامتحانات التي تحتوي على sections فارغة - admin: جميع الامتحانات، teacher: امتحاناته فقط',
  })
  @ApiResponse({ status: 200, description: 'List of exams with empty sections' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin or teacher only' })
  findExamsWithEmptySections(@Req() req: any) {
    this.logger.log(
      `[GET /exams/empty-sections] Request received - userId: ${req?.user?.userId}, role: ${req?.user?.role}`,
    );
    return this.service.findExamsWithEmptySections(req.user);
  }

  // 🔍 DEBUG: فحص تفاصيل الامتحان (admin/teacher)
  @Get('check-sections/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Check exam sections details (admin/teacher)',
    description: 'فحص تفاصيل sections الامتحان - للتحقق من حالة الـ sections',
  })
  @ApiResponse({ status: 200, description: 'Exam sections details' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin or teacher only' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  async checkExamSections(@Param('id') id: string, @Req() req: any) {
    this.logger.log(
      `[GET /exams/check-sections/${id}] Request received - userId: ${req?.user?.userId}, role: ${req?.user?.role}`,
    );
    return this.service.checkExamSections(id, req.user);
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

  // إصلاح جميع الامتحانات التي sections فارغة (admin فقط)
  // ⚠️ يجب أن يكون قبل @Post(':id/...') لتجنب التعارض
  @Post('fix-all-empty-sections')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Fix all exams with empty sections (admin only)',
    description: 'إصلاح جميع الامتحانات التي تحتوي على sections فارغة تلقائياً',
  })
  @ApiResponse({ status: 200, description: 'All exams fixed successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  fixAllExamsWithEmptySections(@Req() req: any) {
    this.logger.log(
      `[POST /exams/fix-all-empty-sections] Request received - userId: ${req?.user?.userId}, role: ${req?.user?.role}`,
    );
    return this.service.fixAllExamsWithEmptySections(req.user);
  }

  // تنظيف الأسئلة المكررة والمحذوفة من جميع أقسام الامتحانات (admin فقط)
  @Post('cleanup-sections')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Cleanup duplicate and deleted questions from all exam sections' })
  cleanupAllSections(@Req() req: any) {
    return this.service.cleanupAllExamSections(req.user);
  }

  // =====================================================
  // ============ Section Management (Admin) =============
  // =====================================================

  // جلب أقسام الامتحان (admin/teacher)
  @Get(':examId/sections')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Get exam sections with question counts (admin/teacher)',
    description: 'جلب أقسام الامتحان مع عدد الأسئلة لكل قسم - admin/teacher فقط',
  })
  @ApiResponse({ status: 200, description: 'Sections list' })
  getExamSections(@Param('examId') examId: string, @Req() req: any) {
    this.logger.log(`[GET /exams/${examId}/sections] Request received`);
    return this.service.getAdminSections(examId, req.user);
  }

  // نظرة عامة على الأقسام للطالب (مع التقدم)
  @Get(':examId/sections/overview')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get sections overview with student progress',
    description: 'نظرة عامة على أقسام الامتحان مع تقدم الطالب - يتطلب JWT لعرض التقدم',
  })
  @ApiResponse({ status: 200, description: 'Sections overview with progress' })
  getSectionsOverview(@Param('examId') examId: string, @Req() req: any) {
    this.logger.log(`[GET /exams/${examId}/sections/overview] Request received`);
    const userId = req.user?.userId || req.user?.sub;
    return this.service.getSectionsOverview(examId, userId);
  }

  // جلب أسئلة قسم معين (للطالب)
  @Get(':examId/sections/:sectionKey/questions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get questions for a specific section with progress',
    description: 'جلب أسئلة قسم معين مع تقدم الطالب - يتطلب JWT لعرض التقدم',
  })
  @ApiResponse({ status: 200, description: 'Section questions with progress' })
  getSectionQuestions(
    @Param('examId') examId: string,
    @Param('sectionKey') sectionKey: string,
    @Req() req: any,
  ) {
    this.logger.log(`[GET /exams/${examId}/sections/${sectionKey}/questions] Request received`);
    const userId = req.user?.userId || req.user?.sub;
    return this.service.getSectionQuestions(examId, sectionKey, userId);
  }

  // جلب التسجيلات الصوتية الموجودة في قسم معين (لإعادة استخدامها)
  @Get(':examId/sections/:sectionKey/clips')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Get existing listening clips in a section',
    description: 'جلب التسجيلات الصوتية المستخدمة في قسم معين - لإعادة ربطها بأسئلة جديدة',
  })
  @ApiResponse({ status: 200, description: 'Listening clips in the section' })
  getSectionClips(
    @Param('examId') examId: string,
    @Param('sectionKey') sectionKey: string,
  ) {
    this.logger.log(`[GET /exams/${examId}/sections/${sectionKey}/clips] Request received`);
    return this.service.getSectionClips(examId, sectionKey);
  }

  // إضافة قسم جديد للامتحان
  @Post(':examId/sections')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Add a new section to exam',
    description: 'إضافة قسم (Teil) جديد للامتحان - يتم توليد key تلقائياً إذا لم يُحدد',
  })
  @ApiResponse({ status: 201, description: 'Section added successfully' })
  addSection(
    @Param('examId') examId: string,
    @Body() dto: AddSectionDto,
    @Req() req: any,
  ) {
    this.logger.log(`[POST /exams/${examId}/sections] Request received - title: ${dto.title}`);
    return this.service.addSection(examId, dto, req.user);
  }

  // تحديث بيانات قسم
  @Patch(':examId/sections/:sectionKey')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Update section metadata',
    description: 'تحديث بيانات قسم معين (العنوان، المهارة، الوقت، إلخ)',
  })
  @ApiResponse({ status: 200, description: 'Section updated successfully' })
  updateSection(
    @Param('examId') examId: string,
    @Param('sectionKey') sectionKey: string,
    @Body() dto: UpdateSectionDto,
    @Req() req: any,
  ) {
    this.logger.log(`[PATCH /exams/${examId}/sections/${sectionKey}] Request received`);
    return this.service.updateSection(examId, sectionKey, dto, req.user);
  }

  // حذف قسم
  @Delete(':examId/sections/:sectionKey')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Remove a section from exam',
    description: 'حذف قسم من الامتحان - الأسئلة تبقى في قاعدة البيانات',
  })
  @ApiResponse({ status: 200, description: 'Section removed successfully' })
  removeSection(
    @Param('examId') examId: string,
    @Param('sectionKey') sectionKey: string,
    @Req() req: any,
  ) {
    this.logger.log(`[DELETE /exams/${examId}/sections/${sectionKey}] Request received`);
    return this.service.removeSection(examId, sectionKey, req.user);
  }

  // إضافة سؤال لقسم
  @Post(':examId/sections/:sectionKey/questions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Add a question to a section',
    description: 'إضافة سؤال موجود إلى قسم معين في الامتحان',
  })
  @ApiResponse({ status: 201, description: 'Question added to section' })
  addQuestionToSection(
    @Param('examId') examId: string,
    @Param('sectionKey') sectionKey: string,
    @Body() dto: AddQuestionToSectionDto,
    @Req() req: any,
  ) {
    this.logger.log(`[POST /exams/${examId}/sections/${sectionKey}/questions] Request received - questionId: ${dto.questionId}`);
    return this.service.addQuestionToSection(examId, sectionKey, dto, req.user);
  }

  // إنشاء عدة أسئلة دفعة واحدة وإضافتها لقسم مع صوت مشترك
  @Post(':examId/sections/:sectionKey/questions/bulk-create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Bulk create questions and add to section',
    description: 'إنشاء عدة أسئلة مع صوت مشترك (listeningClipId) وإضافتها لقسم معين',
  })
  @ApiResponse({ status: 201, description: 'Questions created and added to section' })
  bulkCreateSectionQuestions(
    @Param('examId') examId: string,
    @Param('sectionKey') sectionKey: string,
    @Body() dto: BulkCreateSectionQuestionsDto,
    @Req() req: any,
  ) {
    this.logger.log(
      `[POST /exams/${examId}/sections/${sectionKey}/questions/bulk-create] ` +
      `Request received - ${dto.questions?.length ?? 0} questions, clipId: ${dto.listeningClipId}`,
    );
    return this.service.bulkCreateAndAddToSection(examId, sectionKey, dto, req.user);
  }

  // إعادة ترتيب الأسئلة في قسم
  @Patch(':examId/sections/:sectionKey/questions/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Reorder questions within a section',
    description: 'إعادة ترتيب الأسئلة في قسم معين',
  })
  @ApiResponse({ status: 200, description: 'Questions reordered successfully' })
  reorderSectionQuestions(
    @Param('examId') examId: string,
    @Param('sectionKey') sectionKey: string,
    @Body() dto: ReorderSectionQuestionsDto,
    @Req() req: any,
  ) {
    this.logger.log(`[PATCH /exams/${examId}/sections/${sectionKey}/questions/reorder] Request received`);
    return this.service.reorderSectionQuestions(examId, sectionKey, dto, req.user);
  }

  // تحديث نقاط سؤال في قسم
  @Patch(':examId/sections/:sectionKey/questions/:questionId/points')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Update question points in a section',
    description: 'تحديث نقاط سؤال معين في قسم معين',
  })
  @ApiResponse({ status: 200, description: 'Question points updated successfully' })
  updateQuestionPoints(
    @Param('examId') examId: string,
    @Param('sectionKey') sectionKey: string,
    @Param('questionId') questionId: string,
    @Body() dto: UpdateQuestionPointsDto,
    @Req() req: any,
  ) {
    this.logger.log(`[PATCH /exams/${examId}/sections/${sectionKey}/questions/${questionId}/points] Request received - points: ${dto.points}`);
    return this.service.updateQuestionPoints(examId, sectionKey, questionId, dto.points, req.user);
  }

  // حذف سؤال من قسم
  @Delete(':examId/sections/:sectionKey/questions/:questionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Remove a question from a section',
    description: 'حذف سؤال من قسم معين - السؤال يبقى في قاعدة البيانات',
  })
  @ApiResponse({ status: 200, description: 'Question removed from section' })
  removeQuestionFromSection(
    @Param('examId') examId: string,
    @Param('sectionKey') sectionKey: string,
    @Param('questionId') questionId: string,
    @Req() req: any,
  ) {
    this.logger.log(`[DELETE /exams/${examId}/sections/${sectionKey}/questions/${questionId}] Request received`);
    return this.service.removeQuestionFromSection(examId, sectionKey, questionId, req.user);
  }

  // تحديث listeningAudioId في section معين (مع teilNumber) - يجب أن يكون قبل @Patch(':id')
  @Patch(':examId/sections/:skill/:teilNumber/audio')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Update listening audio for a specific exam section (with teilNumber)',
    description: 'تحديث listeningAudioId في section معين (skill + teilNumber) - teacher: فقط امتحاناته',
  })
  @ApiResponse({ status: 200, description: 'Section audio updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin or teacher (owner only)' })
  @ApiResponse({ status: 404, description: 'Exam or section not found' })
  updateSectionAudioWithTeil(
    @Param('examId') examId: string,
    @Param('skill') skill: string,
    @Param('teilNumber') teilNumber: string,
    @Body() dto: UpdateSectionAudioDto,
    @Req() req: any,
  ) {
    this.logger.log(
      `[PATCH /exams/${examId}/sections/${skill}/${teilNumber}/audio] Request received - userId: ${req?.user?.userId}, role: ${req?.user?.role}`,
    );
    const teilNumberInt = parseInt(teilNumber, 10);
    if (isNaN(teilNumberInt) || teilNumberInt < 1) {
      throw new BadRequestException(`Invalid teilNumber: ${teilNumber}. Must be a positive integer.`);
    }
    return this.service.updateSectionAudio(examId, skill, teilNumberInt, dto.listeningAudioId, req.user);
  }

  // تحديث listeningAudioId في section معين (بدون teilNumber) - يجب أن يكون قبل @Patch(':id')
  @Patch(':examId/sections/:skill/audio')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Update listening audio for a specific exam section (without teilNumber)',
    description: 'تحديث listeningAudioId في section معين (skill فقط) - teacher: فقط امتحاناته',
  })
  @ApiResponse({ status: 200, description: 'Section audio updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin or teacher (owner only)' })
  @ApiResponse({ status: 404, description: 'Exam or section not found' })
  updateSectionAudio(
    @Param('examId') examId: string,
    @Param('skill') skill: string,
    @Body() dto: UpdateSectionAudioDto,
    @Req() req: any,
  ) {
    this.logger.log(
      `[PATCH /exams/${examId}/sections/${skill}/audio] Request received - userId: ${req?.user?.userId}, role: ${req?.user?.role}`,
    );
    return this.service.updateSectionAudio(examId, skill, null, dto.listeningAudioId, req.user);
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

  // إصلاح الامتحان تلقائياً: إضافة quota للأقسام الفارغة (admin/teacher)
  @Post(':id/fix-sections')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Fix empty sections in exam (admin/teacher)',
    description: 'إصلاح الامتحان تلقائياً: إضافة quota=5 للأقسام الفارغة (لا items ولا quota) - teacher: فقط امتحاناته',
  })
  @ApiResponse({ status: 200, description: 'Exam sections fixed successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin or teacher (owner only)' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  fixSections(@Param('id') id: string, @Req() req: any) {
    this.logger.log(
      `[POST /exams/${id}/fix-sections] Request received - userId: ${req?.user?.userId}, role: ${req?.user?.role}`,
    );
    return this.service.fixEmptySections(id, req.user);
  }

  // أرشفة امتحان (بدلاً من الحذف)
  @Patch(':id/archive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Archive exam', description: 'أرشفة امتحان (بدلاً من الحذف)' })
  archive(@Param('id') id: string, @Req() req: any) {
    this.logger.log(
      `PATCH /exams/${id}/archive - user: ${req?.user?.userId}, role: ${req?.user?.role}`,
    );
    return this.service.archive(id, req?.user);
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

  // جلب قائمة امتحانات Leben in Deutschland المتاحة
  @Get('leben/available')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get available Leben in Deutschland exams',
    description: 'جلب قائمة امتحانات Leben in Deutschland المنشورة والمتاحة',
  })
  @ApiResponse({ status: 200, description: 'List of available Leben exams' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAvailableLebenExams() {
    return this.service.getAvailableLebenExams();
  }

  // بدء محاولة Leben in Deutschland exam (للطلاب)
  @Post('leben/start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @ApiOperation({
    summary: 'Start Leben in Deutschland exam attempt (for students)',
    description:
      'بدء محاولة على امتحان Leben in Deutschland - للطلاب فقط. Exam يجب أن يكون منشور (published) ومتاح للطلاب. يتم اختيار 30 سؤال عام و 3 أسئلة خاصة بالولاية عشوائياً.',
  })
  @ApiResponse({ status: 201, description: 'Leben exam attempt started successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - exam not found, not a Leben exam, not published, or attempt limit reached',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async startLebenExam(@Body() dto: StartLebenExamDto, @Req() req: any) {
    this.logger.log(
      `[POST /exams/leben/start] Request received - examId: ${dto.examId}, state: ${dto.state}, userId: ${req.user?.sub || req.user?.userId}, role: ${req.user?.role}`,
    );
    const studentId = req.user?.sub || req.user?.userId || req.user?.id;
    if (!studentId) {
      throw new BadRequestException('Student ID not found in token');
    }
    return this.attemptsService.startLebenExam(dto, studentId);
  }
}
