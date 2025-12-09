import { Controller, Get, Query, UseGuards, Req, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { QueryStudentsDto } from './dto/query-students.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'teacher')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('students')
  @ApiOperation({
    summary: 'Get students list',
    description: 'جلب قائمة الطلاب مع الفلاتر والإحصائيات',
  })
  @ApiQuery({ name: 'search', required: false, description: 'اسم أو إيميل الطالب' })
  @ApiQuery({ name: 'level', required: false, enum: ['A1', 'A2', 'B1', 'B2', 'C1'] })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive', 'blocked'] })
  @ApiQuery({ name: 'activity', required: false, enum: ['hasAttempts', 'noAttempts'] })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'رقم الصفحة' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'عدد النتائج في الصفحة' })
  getStudents(@Query() query: QueryStudentsDto) {
    return this.adminService.getStudents(query);
  }

  @Get('students/:studentId')
  @ApiOperation({
    summary: 'Get student by ID',
    description: 'جلب تفاصيل طالب محدد',
  })
  @ApiParam({ name: 'studentId', description: 'معرف الطالب' })
  async getStudentById(@Param('studentId') studentId: string) {
    const student = await this.adminService.getStudentById(studentId);
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    return student;
  }

  @Get('students/:studentId/performance')
  @ApiOperation({
    summary: 'Get student performance statistics',
    description: 'جلب إحصائيات الأداء للطالب',
  })
  @ApiParam({ name: 'studentId', description: 'معرف الطالب' })
  async getStudentPerformance(@Param('studentId') studentId: string) {
    // التحقق من وجود الطالب أولاً
    const student = await this.adminService.getStudentById(studentId);
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    return this.adminService.getStudentPerformance(studentId);
  }
}

