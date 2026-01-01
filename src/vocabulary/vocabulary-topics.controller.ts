import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { VocabularyTopicsService } from './vocabulary-topics.service';
import { CreateVocabularyTopicDto } from './dto/create-vocabulary-topic.dto';
import { UpdateVocabularyTopicDto } from './dto/update-vocabulary-topic.dto';
import { QueryVocabularyTopicDto } from './dto/query-vocabulary-topic.dto';

@ApiTags('Vocabulary Topics')
@Controller('vocabulary-topics')
export class VocabularyTopicsController {
  constructor(private readonly topicsService: VocabularyTopicsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new vocabulary topic' })
  @ApiResponse({ status: 201, description: 'Topic created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  create(@Body() createDto: CreateVocabularyTopicDto) {
    return this.topicsService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all vocabulary topics (optionally filtered by level and slug)' })
  @ApiQuery({ name: 'level', required: false, enum: ['A1', 'A2', 'B1', 'B2', 'C1'] })
  @ApiQuery({ name: 'slug', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of topics' })
  findAll(@Query() query: QueryVocabularyTopicDto) {
    return this.topicsService.findAll(query);
  }

  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Get a vocabulary topic by slug' })
  @ApiResponse({ status: 200, description: 'Topic found' })
  @ApiResponse({ status: 404, description: 'Topic not found' })
  findBySlug(@Param('slug') slug: string) {
    return this.topicsService.findBySlug(slug);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a vocabulary topic by ID' })
  @ApiResponse({ status: 200, description: 'Topic found' })
  @ApiResponse({ status: 404, description: 'Topic not found' })
  findOne(@Param('id') id: string) {
    return this.topicsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a vocabulary topic' })
  @ApiResponse({ status: 200, description: 'Topic updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 404, description: 'Topic not found' })
  update(@Param('id') id: string, @Body() dto: UpdateVocabularyTopicDto) {
    return this.topicsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a vocabulary topic' })
  @ApiResponse({ status: 204, description: 'Topic deleted successfully' })
  @ApiResponse({ status: 404, description: 'Topic not found' })
  remove(@Param('id') id: string) {
    return this.topicsService.remove(id);
  }
}

