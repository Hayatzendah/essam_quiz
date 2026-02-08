import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SchreibenTasksService } from './schreiben-tasks.service';
import { CreateSchreibenTaskDto } from './dto/create-schreiben-task.dto';
import { UpdateSchreibenTaskDto } from './dto/update-schreiben-task.dto';
import { ReorderSchreibenTasksDto } from './dto/reorder-tasks.dto';

import { LinkSchreibenExamDto } from './dto/link-exam.dto';

@ApiTags('schreiben-tasks')
@Controller('schreiben/tasks')
export class SchreibenTasksController {
  constructor(private readonly service: SchreibenTasksService) {}

  // ============ عمليات القراءة (عامة) ============

  @Get()
  @ApiOperation({ summary: 'الحصول على جميع مهام الكتابة' })
  @ApiQuery({ name: 'level', required: false, enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] })
  @ApiQuery({ name: 'provider', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'published', 'archived'] })
  @ApiResponse({ status: 200, description: 'قائمة مهام الكتابة' })
  findAll(
    @Query('level') level?: string,
    @Query('provider') provider?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll({ level, provider, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'الحصول على مهمة كتابة واحدة' })
  @ApiResponse({ status: 200, description: 'المهمة' })
  @ApiResponse({ status: 404, description: 'المهمة غير موجودة' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // ============ عمليات الكتابة (للمعلم والأدمن) ============

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إنشاء مهمة كتابة جديدة' })
  @ApiResponse({ status: 201, description: 'تم إنشاء المهمة' })
  @ApiResponse({ status: 400, description: 'بيانات غير صالحة' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع - للمعلم والأدمن فقط' })
  create(@Body(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false, transform: true })) dto: CreateSchreibenTaskDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تحديث مهمة كتابة' })
  @ApiResponse({ status: 200, description: 'تم التحديث' })
  @ApiResponse({ status: 404, description: 'المهمة غير موجودة' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع - للمعلم والأدمن فقط' })
  update(@Param('id') id: string, @Body(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false, transform: true })) dto: UpdateSchreibenTaskDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف مهمة كتابة' })
  @ApiResponse({ status: 200, description: 'تم الحذف' })
  @ApiResponse({ status: 404, description: 'المهمة غير موجودة' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع - للمعلم والأدمن فقط' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // ============ عمليات خاصة ============

  @Patch('reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إعادة ترتيب مهام الكتابة' })
  @ApiResponse({ status: 200, description: 'تم إعادة الترتيب' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع - للمعلم والأدمن فقط' })
  reorderTasks(@Body() dto: ReorderSchreibenTasksDto) {
    return this.service.reorderTasks(dto.taskIds);
  }

  @Patch(':id/content-blocks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تحديث بلوكات المحتوى فقط' })
  @ApiResponse({ status: 200, description: 'تم التحديث' })
  @ApiResponse({ status: 404, description: 'المهمة غير موجودة' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع - للمعلم والأدمن فقط' })
  updateContentBlocks(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    // نستقبل الـ body مباشرة بدون ValidationPipe لضمان عدم حذف أي بيانات
    const body = req.body;
    const contentBlocks = Array.isArray(body) ? body : body.contentBlocks || [];
    return this.service.updateContentBlocks(id, contentBlocks);
  }

  @Get(':id/fields')
  @ApiOperation({ summary: 'عرض كل حقول النموذج مع الإجابات الصحيحة' })
  getFields(@Param('id') id: string) {
    return this.service.getFieldsWithAnswers(id);
  }

  @Patch(':id/fields/correct-answers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تحديث الإجابات الصحيحة لكل الحقول دفعة واحدة' })
  updateAllCorrectAnswers(
    @Param('id') id: string,
    @Body() body: { answers: Array<{ fieldId: string; value?: string; correctAnswers?: string[] }> },
  ) {
    return this.service.updateAllCorrectAnswers(id, body.answers);
  }

  @Patch(':id/fields/:fieldId/correct-answer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تحديث الإجابة الصحيحة لحقل في النموذج' })
  @ApiResponse({ status: 200, description: 'تم تحديث الإجابة الصحيحة' })
  @ApiResponse({ status: 404, description: 'المهمة أو الحقل غير موجود' })
  updateFieldCorrectAnswer(
    @Param('id') id: string,
    @Param('fieldId') fieldId: string,
    @Body() body: { value?: string; correctAnswers?: string[] },
  ) {
    return this.service.updateFieldCorrectAnswer(id, fieldId, body);
  }

  @Patch(':id/link-exam')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ربط مهمة الكتابة بامتحان' })
  @ApiResponse({ status: 200, description: 'تم ربط المهمة بالامتحان' })
  @ApiResponse({ status: 404, description: 'المهمة غير موجودة' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع - للمعلم والأدمن فقط' })
  linkExam(@Param('id') id: string, @Body() dto: LinkSchreibenExamDto) {
    return this.service.linkExam(id, dto.examId);
  }

  @Delete(':id/link-exam')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إلغاء ربط مهمة الكتابة بامتحان' })
  @ApiResponse({ status: 200, description: 'تم إلغاء الربط' })
  @ApiResponse({ status: 404, description: 'المهمة غير موجودة' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع - للمعلم والأدمن فقط' })
  unlinkExam(@Param('id') id: string) {
    return this.service.unlinkExam(id);
  }
}
