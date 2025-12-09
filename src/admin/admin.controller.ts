import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
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
}

