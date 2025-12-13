import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { VocabularyWordsService } from './vocabulary-words.service';
import { CreateVocabularyWordDto } from './dto/create-vocabulary-word.dto';
import { UpdateVocabularyWordDto } from './dto/update-vocabulary-word.dto';
import { QueryVocabularyWordDto } from './dto/query-vocabulary-word.dto';
import { CreateBulkVocabularyWordsDto } from './dto/create-bulk-vocabulary-words.dto';

@ApiTags('Vocabulary Words')
@Controller('vocabulary-words')
export class VocabularyWordsController {
  constructor(private readonly wordsService: VocabularyWordsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new vocabulary word' })
  @ApiResponse({ status: 201, description: 'Word created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 404, description: 'Topic not found' })
  create(@Body() createDto: CreateVocabularyWordDto) {
    return this.wordsService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all vocabulary words (optionally filtered by topicId)' })
  @ApiQuery({ name: 'topicId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of words' })
  findAll(@Query() query: QueryVocabularyWordDto) {
    return this.wordsService.findAll(query);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create multiple vocabulary words at once (bulk insert)' })
  @ApiResponse({ status: 201, description: 'Words created successfully', schema: { properties: { insertedCount: { type: 'number' }, ids: { type: 'array', items: { type: 'string' } } } } })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 404, description: 'Topic not found' })
  createBulk(@Body() createBulkDto: CreateBulkVocabularyWordsDto) {
    return this.wordsService.createBulk(createBulkDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a vocabulary word by ID' })
  @ApiResponse({ status: 200, description: 'Word found' })
  @ApiResponse({ status: 404, description: 'Word not found' })
  findOne(@Param('id') id: string) {
    return this.wordsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a vocabulary word' })
  @ApiResponse({ status: 200, description: 'Word updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 404, description: 'Word not found' })
  update(@Param('id') id: string, @Body() updateDto: UpdateVocabularyWordDto) {
    return this.wordsService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a vocabulary word' })
  @ApiResponse({ status: 204, description: 'Word deleted successfully' })
  @ApiResponse({ status: 404, description: 'Word not found' })
  remove(@Param('id') id: string) {
    return this.wordsService.remove(id);
  }
}

