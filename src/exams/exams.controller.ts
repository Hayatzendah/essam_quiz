import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, Req } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { QueryExamDto } from './dto/query-exam.dto';
import { AssignExamDto } from './dto/assign-exam.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('exams')
export class ExamsController {
  constructor(private readonly service: ExamsService) {}

  // إنشاء امتحان (admin/teacher)
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin','teacher')
  create(@Body() dto: CreateExamDto, @Req() req: any) {
    return this.service.createExam(dto, req.user);
  }

  // قائمة الامتحانات (المعلم: امتحاناته فقط | الأدمن: الكل)
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin','teacher')
  findAll(@Query() q: QueryExamDto, @Req() req: any) {
    return this.service.findAll(req.user, q);
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

  // إسناد امتحان (اختياري)
  @Post(':id/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin','teacher')
  assign(@Param('id') id: string, @Body() dto: AssignExamDto, @Req() req: any) {
    return this.service.assignExam(id, dto, req.user);
  }
}

