import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { NounsService } from './nouns.service';
import { CreateNounDto } from './dto/create-noun.dto';
import { UpdateNounDto } from './dto/update-noun.dto';
import { CreateBulkNounsDto } from './dto/create-bulk-nouns.dto';
import { QueryNounDto } from './dto/query-noun.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Nouns (Der/Die/Das)')
@Controller('nouns')
export class NounsController {
  constructor(private readonly nounsService: NounsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Create a new noun' })
  @ApiResponse({ status: 201, description: 'Noun created successfully' })
  create(@Body() dto: CreateNounDto) {
    return this.nounsService.create(dto);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Bulk insert nouns' })
  @ApiResponse({ status: 201, description: 'Nouns created successfully' })
  createBulk(@Body() dto: CreateBulkNounsDto) {
    return this.nounsService.createBulk(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all nouns (optionally filtered by level)' })
  @ApiQuery({ name: 'level', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: String })
  findAll(@Query() query: QueryNounDto) {
    return this.nounsService.findAll(query);
  }

  @Get('count')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Get noun count per level' })
  count() {
    return this.nounsService.countByLevel();
  }

  @Get('quiz')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get random nouns for quiz' })
  @ApiQuery({ name: 'level', required: true, type: String })
  @ApiQuery({ name: 'count', required: true, type: Number })
  getQuizNouns(
    @Query('level') level: string,
    @Query('count') count: string,
  ) {
    return this.nounsService.getRandomNouns(level, parseInt(count, 10));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a noun by ID' })
  @ApiResponse({ status: 200, description: 'Noun found' })
  @ApiResponse({ status: 404, description: 'Noun not found' })
  findOne(@Param('id') id: string) {
    return this.nounsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Update a noun' })
  @ApiResponse({ status: 200, description: 'Noun updated successfully' })
  update(@Param('id') id: string, @Body() dto: UpdateNounDto) {
    return this.nounsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Delete a noun' })
  @ApiResponse({ status: 204, description: 'Noun deleted successfully' })
  remove(@Param('id') id: string) {
    return this.nounsService.remove(id);
  }
}
