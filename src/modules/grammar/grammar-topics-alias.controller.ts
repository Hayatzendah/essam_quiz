import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GrammarTopicsService } from './grammar-topics.service';
import { GrammarTopicResponseDto } from './dto/grammar-topic-response.dto';

/**
 * Controller للتوافق مع الفرونت: GET /grammatik/:level/:slug
 * هذا controller يعيد توجيه الطلبات إلى GrammarTopicsService
 */
@ApiTags('Grammar Topics')
@ApiBearerAuth('JWT-auth')
@Controller('grammatik')
export class GrammarTopicsAliasController {
  constructor(private readonly grammarTopicsService: GrammarTopicsService) {}

  @ApiOperation({ summary: 'Get a grammar topic by level and slug (alias route)' })
  @ApiResponse({
    status: 200,
    description: 'Returns the grammar topic',
    type: GrammarTopicResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Grammar topic not found' })
  @Get(':level/:slug')
  findByLevelAndSlug(@Param('level') level: string, @Param('slug') slug: string) {
    return this.grammarTopicsService.findBySlug(slug, level);
  }
}

