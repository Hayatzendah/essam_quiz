import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { LevelsService } from './levels.service';
import { CreateLevelDto } from './dto/create-level.dto';
import { UpdateLevelDto } from './dto/update-level.dto';
import { ReorderLevelsDto } from './dto/reorder-levels.dto';
import { DeleteLevelDto } from './dto/delete-level.dto';

@ApiTags('Levels')
@Controller('levels')
export class LevelsController {
  constructor(private readonly levelsService: LevelsService) {}

  @Get()
  @ApiOperation({ summary: 'الحصول على المستويات النشطة مرتبة حسب الترتيب' })
  @ApiResponse({ status: 200, description: 'قائمة المستويات النشطة' })
  findActive() {
    return this.levelsService.findActive();
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'الحصول على جميع المستويات بما فيها غير النشطة' })
  @ApiResponse({ status: 200, description: 'قائمة جميع المستويات' })
  findAll() {
    return this.levelsService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'إنشاء مستوى جديد' })
  @ApiResponse({ status: 201, description: 'تم إنشاء المستوى' })
  @ApiResponse({ status: 409, description: 'المستوى موجود بالفعل' })
  create(@Body() dto: CreateLevelDto) {
    return this.levelsService.create(dto);
  }

  @Patch('reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إعادة ترتيب المستويات' })
  @ApiResponse({ status: 200, description: 'تم إعادة الترتيب' })
  reorder(@Body() dto: ReorderLevelsDto) {
    return this.levelsService.reorder(dto.levelIds);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تحديث مستوى' })
  @ApiResponse({ status: 200, description: 'تم التحديث' })
  @ApiResponse({ status: 404, description: 'المستوى غير موجود' })
  update(@Param('id') id: string, @Body() dto: UpdateLevelDto) {
    return this.levelsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف مستوى مع نقل العناصر' })
  @ApiResponse({ status: 200, description: 'تم الحذف' })
  @ApiResponse({ status: 400, description: 'لا يمكن حذف المستوى الافتراضي' })
  @ApiResponse({ status: 404, description: 'المستوى غير موجود' })
  async remove(@Param('id') id: string, @Body() dto: DeleteLevelDto) {
    await this.levelsService.deleteWithReassignment(id, dto.reassignTo);
    return { message: 'تم حذف المستوى ونقل العناصر بنجاح' };
  }

  @Get(':id/count')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'عدد العناصر المرتبطة بمستوى' })
  async getItemCount(@Param('id') id: string) {
    const level = await this.levelsService.findOne(id);
    const count = await this.levelsService.getItemCounts(level.name);
    return { count };
  }
}
