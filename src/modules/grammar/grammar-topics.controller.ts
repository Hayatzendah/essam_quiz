import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GrammarTopicsService } from './grammar-topics.service';
import { CreateGrammarTopicDto } from './dto/create-grammar-topic.dto';
import { UpdateGrammarTopicDto } from './dto/update-grammar-topic.dto';
import { StartGrammarExerciseDto } from './dto/start-grammar-exercise.dto';
import { GrammarTopicResponseDto } from './dto/grammar-topic-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Grammar Topics')
@ApiBearerAuth('JWT-auth')
@Controller('grammar/topics')
export class GrammarTopicsController {
  constructor(private readonly grammarTopicsService: GrammarTopicsService) {}

  @ApiOperation({ summary: 'List all grammar topics, optionally filtered by level' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of grammar topics',
    type: [GrammarTopicResponseDto],
  })
  @Get()
  findAll(@Query('level') level?: string) {
    return this.grammarTopicsService.findAll({ level });
  }

  @ApiOperation({ summary: 'Get a grammar topic by slug' })
  @ApiResponse({
    status: 200,
    description: 'Returns the grammar topic',
    type: GrammarTopicResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Grammar topic not found' })
  @Get(':slug')
  findBySlug(@Param('slug') slug: string, @Query('level') level?: string) {
    return this.grammarTopicsService.findBySlug(slug, level);
  }

  @ApiOperation({ summary: 'Create a new grammar topic' })
  @ApiResponse({ status: 201, description: 'Grammar topic created successfully' })
  @Post()
  create(@Body() dto: CreateGrammarTopicDto) {
    return this.grammarTopicsService.create(dto);
  }

  @ApiOperation({ summary: 'Update a grammar topic' })
  @ApiResponse({ status: 200, description: 'Grammar topic updated successfully' })
  @ApiResponse({ status: 404, description: 'Grammar topic not found' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGrammarTopicDto) {
    return this.grammarTopicsService.update(id, dto);
  }

  // بدء محاولة تمرين على grammar topic (للطلاب)
  @Post(':slug/attempts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @ApiOperation({
    summary: 'Start practice attempt for grammar topic (for students)',
    description:
      'بدء محاولة تمرين على موضوع قواعد نحوية - يتم البحث عن الأسئلة المرتبطة بالموضوع وإنشاء attempt تلقائياً',
  })
  @ApiResponse({ status: 201, description: 'Practice attempt started successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed or no questions found',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Grammar topic not found' })
  async startAttempt(
    @Param('slug') slug: string,
    @Body() dto: StartGrammarExerciseDto,
    @CurrentUser() user: any,
  ) {
    return this.grammarTopicsService.startPracticeAttempt(slug, dto, user);
  }
}
