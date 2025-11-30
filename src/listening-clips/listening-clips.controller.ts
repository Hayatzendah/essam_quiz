import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ListeningClipsService } from './listening-clips.service';
import { CreateListeningClipDto } from './dto/create-listening-clip.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Listening Clips')
@ApiBearerAuth('JWT-auth')
@Controller('listening-clips')
export class ListeningClipsController {
  constructor(private readonly service: ListeningClipsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/audio',
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `listening-${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
      fileFilter: (req, file, callback) => {
        if (!/^audio\//.test(file.mimetype)) {
          return callback(
            new BadRequestException('Only audio files are allowed') as any,
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  @ApiOperation({
    summary: 'Create a new listening clip',
    description: 'إنشاء كليب استماع جديد مع رفع ملف صوتي',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        provider: {
          type: 'string',
          enum: ['goethe', 'telc', 'oesd', 'ecl', 'dtb', 'dtz'],
        },
        level: {
          type: 'string',
          enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
        },
        skill: {
          type: 'string',
          enum: ['hoeren', 'lesen', 'schreiben', 'sprechen'],
        },
        teil: {
          type: 'number',
        },
        title: {
          type: 'string',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Listening clip created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid file or data' })
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateListeningClipDto,
  ) {
    if (!file) {
      throw new BadRequestException('No audio file uploaded');
    }

    const baseUrl = process.env.API_BASE_URL || '';
    const audioUrl = baseUrl 
      ? `${baseUrl}/uploads/audio/${file.filename}`
      : `/uploads/audio/${file.filename}`;

    dto.audioUrl = audioUrl;
    return this.service.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get all listening clips',
    description: 'الحصول على جميع كليبات الاستماع مع إمكانية الفلترة',
  })
  @ApiResponse({ status: 200, description: 'List of listening clips' })
  async findAll(
    @Query('provider') provider?: string,
    @Query('level') level?: string,
    @Query('skill') skill?: string,
    @Query('teil') teil?: number,
  ) {
    return this.service.findAll({ provider, level, skill, teil });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get a listening clip by ID',
    description: 'الحصول على كليب استماع محدد',
  })
  @ApiResponse({ status: 200, description: 'Listening clip found' })
  @ApiResponse({ status: 404, description: 'Listening clip not found' })
  async findOne(@Param('id') id: string) {
    return this.service.findOneOrFail(id);
  }
}

