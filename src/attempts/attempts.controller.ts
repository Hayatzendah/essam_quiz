import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AttemptsService } from './attempts.service';
import { StartAttemptDto } from './dto/start-attempt.dto';
import { AnswerOneDto } from './dto/answer.dto';
import { SubmitAttemptDto } from './dto/submit.dto';
import { GradeAttemptDto } from './dto/grade.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Attempts')
@ApiBearerAuth('JWT-auth')
@Controller('attempts')
export class AttemptsController {
  constructor(private readonly service: AttemptsService) {}

  // قائمة محاولات الطالب
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  findMyAttempts(@Query('examId') examId?: string, @Req() req: any) {
    return this.service.findByStudent(req.user, examId);
  }

  // بدء محاولة امتحان (طالب فقط)
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  start(@Body() dto: StartAttemptDto, @Req() req: any) {
    return this.service.startAttempt(dto.examId, req.user);
  }

  // حفظ إجابة أثناء المحاولة (طالب فقط)
  @Patch(':attemptId/answer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  answer(@Param('attemptId') attemptId: string, @Body() dto: AnswerOneDto, @Req() req: any) {
    return this.service.saveAnswer(req.user, attemptId, {
      itemIndex: dto.itemIndex,
      questionId: dto.questionId,
      studentAnswerIndexes: dto.studentAnswerIndexes,
      studentAnswerText: dto.studentAnswerText,
      studentAnswerBoolean: dto.studentAnswerBoolean,
      studentAnswerMatch: dto.studentAnswerMatch,
      studentAnswerReorder: dto.studentAnswerReorder,
      studentAnswerAudioKey: dto.studentAnswerAudioKey,
    });
  }

  // تسليم المحاولة (طالب فقط)
  @Post(':attemptId/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  submit(@Param('attemptId') attemptId: string, @Body() _dto: SubmitAttemptDto, @Req() req: any) {
    return this.service.submitAttempt(req.user, attemptId);
  }

  // إدخال درجات يدوية (معلم مالك أو أدمن)
  @Post(':attemptId/grade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher','admin')
  grade(@Param('attemptId') attemptId: string, @Body() dto: GradeAttemptDto, @Req() req: any) {
    return this.service.gradeAttempt(req.user, attemptId, dto.items);
  }

  // عرض المحاولة (الطالب مالكها | المعلم المالك للامتحان | الأدمن)
  @Get(':attemptId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student','teacher','admin')
  view(@Param('attemptId') attemptId: string, @Req() req: any) {
    return this.service.getAttempt(req.user, attemptId);
  }
}



