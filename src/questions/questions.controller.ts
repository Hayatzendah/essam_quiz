import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, Req } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QueryQuestionDto } from './dto/query-question.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly service: QuestionsService) {}

  // POST /questions  (admin/teacher فقط)
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  create(@Body() dto: CreateQuestionDto, @Req() req: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    return this.service.createQuestion(dto, userId);
  }

  // GET /questions  (admin/teacher يقدروا يشوفوا ويعملوا فلترة)
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  findMany(@Query() q: QueryQuestionDto) {
    return this.service.findQuestions(q);
  }

  // PATCH /questions/:id  (admin/teacher فقط)
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  update(@Param('id') id: string, @Body() dto: UpdateQuestionDto) {
    return this.service.updateQuestion(id, dto);
  }

  // DELETE /questions/:id?hard=true  (admin/teacher فقط)
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  async remove(@Param('id') id: string, @Query('hard') hard?: string) {
    const res = await this.service.removeQuestion(id, hard === 'true');
    // 204 لو حابة بدون جسم؛ هنا بنرجّع 200 برسالة خفيفة
    return res;
  }
}
