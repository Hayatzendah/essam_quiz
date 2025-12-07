import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Analytics')
@ApiBearerAuth('JWT-auth')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  @ApiOperation({ summary: 'Get analytics overview', description: 'الحصول على نظرة عامة على الإحصائيات' })
  getOverview(@Req() req: any) {
    return this.analytics.getOverview(req.user);
  }

  @Get('activity')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  @ApiOperation({ 
    summary: 'Get activity analytics', 
    description: 'الحصول على إحصائيات النشاط اليومي (عدد المحاولات لكل يوم)' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'قائمة بالنشاط اليومي',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string', example: '2025-12-01' },
          count: { type: 'number', example: 12 }
        }
      }
    }
  })
  getActivity(@Query('days') days?: string, @Req() req?: any) {
    const daysNumber = days ? parseInt(days, 10) : 7; // افتراضي 7 أيام
    return this.analytics.getActivity(daysNumber, req?.user);
  }

  @Get('pass-rate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  @ApiOperation({ 
    summary: 'Get pass rate analytics', 
    description: 'الحصول على إحصائيات معدل النجاح لكل امتحان' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'معدل النجاح الإجمالي ومعدل النجاح لكل امتحان',
    schema: {
      type: 'object',
      properties: {
        overallPassRate: { type: 'number', example: 75 },
        exams: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              examId: { type: 'string' },
              examName: { type: 'string' },
              attemptsCount: { type: 'number' },
              passedCount: { type: 'number' },
              passRate: { type: 'number' }
            }
          }
        }
      }
    }
  })
  getPassRate(@Query('days') days?: string, @Req() req?: any) {
    const daysNumber = days ? parseInt(days, 10) : 30; // افتراضي 30 يوم
    return this.analytics.getPassRate(daysNumber, req?.user);
  }

  @Get('exam-performance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  @ApiOperation({ 
    summary: 'Get exam performance analytics', 
    description: 'جلب أفضل أو أسوأ الامتحانات حسب متوسط الدرجات' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'قائمة بالامتحانات مع متوسط الدرجات وعدد المحاولات',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          examId: { type: 'string' },
          examName: { type: 'string' },
          avgScore: { type: 'number' },
          attempts: { type: 'number' }
        }
      }
    }
  })
  getExamPerformance(@Query('type') type?: string, @Req() req?: any) {
    const performanceType = (type === 'worst' ? 'worst' : 'best') as 'best' | 'worst';
    return this.analytics.getExamPerformance(performanceType, req?.user);
  }

  @Get('skills')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  @ApiOperation({ 
    summary: 'Get skills analytics', 
    description: 'أداء الطلاب حسب المهارة (Hören، Lesen، Schreiben، Sprechen، misc)' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'إحصائيات لكل مهارة',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          skill: { type: 'string', example: 'hoeren' },
          skillLabel: { type: 'string', example: 'Hören' },
          attemptsCount: { type: 'number', example: 120 },
          avgScore: { type: 'number', example: 76 },
          passRate: { type: 'number', example: 70 }
        }
      }
    }
  })
  getSkills(@Req() req?: any) {
    return this.analytics.getSkills(req?.user);
  }

  @Get('questions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  @ApiOperation({ 
    summary: 'Get questions analytics', 
    description: 'إحصائيات الأسئلة حسب المهارة والمستوى والحالة' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'إحصائيات الأسئلة',
    schema: {
      type: 'object',
      properties: {
        bySkill: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              skill: { type: 'string', example: 'hoeren' },
              count: { type: 'number', example: 140 }
            }
          }
        },
        byLevel: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              level: { type: 'string', example: 'A1' },
              count: { type: 'number', example: 90 }
            }
          }
        },
        published: { type: 'number', example: 350 },
        draft: { type: 'number', example: 153 }
      }
    }
  })
  getQuestions(@Req() req?: any) {
    return this.analytics.getQuestions(req?.user);
  }

  @Get('exam/:examId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  getExamAnalytics(@Param('examId') examId: string, @Req() req: any) {
    return this.analytics.getExamAnalytics(examId, req.user);
  }

  @Get('question/:questionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  getQuestionAnalytics(@Param('questionId') questionId: string, @Req() req: any) {
    return this.analytics.getQuestionAnalytics(questionId, req.user);
  }

  @Get('questions/incorrect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  @ApiOperation({ 
    summary: 'Get most incorrect questions', 
    description: 'الأسئلة الأكثر خطأ (أعلى عدد إجابات خاطئة)' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'قائمة بالأسئلة الأكثر خطأ',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          questionId: { type: 'string' },
          questionPrompt: { type: 'string' },
          totalAnswers: { type: 'number' },
          wrongAnswers: { type: 'number' },
          successRate: { type: 'number' }
        }
      }
    }
  })
  getMostIncorrectQuestions(@Req() req?: any) {
    return this.analytics.getMostIncorrectQuestions(req?.user);
  }

  @Get('questions/needing-improvement')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  @ApiOperation({ 
    summary: 'Get questions needing improvement', 
    description: 'الأسئلة التي تحتاج تطوير (نسبة النجاح أقل من 40%)' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'قائمة بالأسئلة التي تحتاج تطوير',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          questionId: { type: 'string' },
          questionPrompt: { type: 'string' },
          totalAnswers: { type: 'number' },
          wrongAnswers: { type: 'number' },
          successRate: { type: 'number' }
        }
      }
    }
  })
  getQuestionsNeedingImprovement(@Req() req?: any) {
    return this.analytics.getQuestionsNeedingImprovement(req?.user);
  }
}
