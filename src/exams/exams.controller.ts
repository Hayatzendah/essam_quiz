import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, Req, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ExamsService } from './exams.service';
import { CreateExamDto, CreatePracticeExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { QueryExamDto } from './dto/query-exam.dto';
import { AssignExamDto } from './dto/assign-exam.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Exams')
@ApiBearerAuth('JWT-auth')
@Controller('exams')
export class ExamsController {
  private readonly logger = new Logger(ExamsController.name);

  constructor(private readonly service: ExamsService) {}

  // إنشاء امتحان (admin/teacher)
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin','teacher')
  create(@Body() dto: CreateExamDto, @Req() req: any) {
    this.logger.log(`[POST /exams] Request received - userId: ${req.user?.userId}, role: ${req.user?.role}, user object: ${JSON.stringify(req.user)}`);
    return this.service.createExam(dto, req.user);
  }

  // إنشاء امتحان تمرين ديناميكي (للطلاب - للتمارين)
  @Post('practice')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student', 'admin', 'teacher')
  @ApiOperation({ summary: 'Create practice exam (for students)', description: 'إنشاء امتحان تمرين ديناميكي للطلاب مع أسئلة محددة' })
  @ApiResponse({ status: 201, description: 'Practice exam created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  createPracticeExam(@Body() dto: CreatePracticeExamDto, @Req() req: any) {
    this.logger.log(`[POST /exams/practice] Request received - userId: ${req.user?.userId}, role: ${req.user?.role}, sections: ${dto?.sections?.length || 0}`);
    return this.service.createPracticeExam(dto, req.user);
  }

  // قائمة الامتحانات
  // - admin: جميع الامتحانات
  // - teacher: امتحاناته فقط
  // - student: الامتحانات المنشورة المتاحة
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin','teacher','student')
  findAll(@Query() q: QueryExamDto, @Req() req: any) {
    return this.service.findAll(req.user, q);
  }

  // قائمة الامتحانات المتاحة للطلاب
  @Get('available')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  findAvailable(@Query() q: QueryExamDto, @Req() req: any) {
    return this.service.findAvailableForStudent(req.user, q);
  }

  // تفاصيل الامتحان
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin','teacher','student')
  findById(@Param('id') id: string, @Req() req: any) {
    return this.service.findById(id, req.user);
  }

  // تحديث الامتحان (المالك أو الأدمن)
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin','teacher')
  update(@Param('id') id: string, @Body() dto: UpdateExamDto, @Req() req: any) {
    return this.service.updateExam(id, dto, req.user);
  }

  // حذف امتحان (المالك أو الأدمن)
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin','teacher')
  remove(@Param('id') id: string, @Query('hard') hard?: string, @Req() req?: any) {
    this.logger.log(`DELETE /exams/${id} - hard: ${hard}, user: ${req?.user?.userId}, role: ${req?.user?.role}`);
    return this.service.removeExam(id, req?.user, hard === 'true');
  }

  // إسناد امتحان (اختياري) - يجب أن يكون بعد DELETE لتجنب التعارض
  @Post(':id/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin','teacher')
  assign(@Param('id') id: string, @Body() dto: AssignExamDto, @Req() req: any) {
    return this.service.assignExam(id, dto, req.user);
  }
}

