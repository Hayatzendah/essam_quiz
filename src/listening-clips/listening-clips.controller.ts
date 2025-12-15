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
import { extname, join } from 'path';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ListeningClipsService } from './listening-clips.service';
import { CreateListeningClipDto } from './dto/create-listening-clip.dto';
import { SkillEnum } from './schemas/listening-clip.schema';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { audioFileFilter, getDefaultAudioExtension } from '../common/utils/audio-file-validator.util';

@ApiTags('Listening Clips')
@ApiBearerAuth('JWT-auth')
@Controller(['listening-clips', 'listeningclips']) // دعم كلا المسارين
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
          const timestamp = Date.now();
          const random = Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname) || getDefaultAudioExtension();
          cb(null, `listening-${timestamp}-${random}${ext}`);
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
      fileFilter: audioFileFilter,
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

    console.log('Saved listening clip at', file.path); // خلي الباك يطبع ده

    // استخدام مسار نسبي فقط (بدون baseUrl) لأن الفرونت سيبني الـ URL الكامل
    const audioUrl = `/uploads/audio/${file.filename}`;

    dto.audioUrl = audioUrl;
    const clip = await this.service.create(dto);
    
    // إرجاع كل البيانات المطلوبة
    return {
      _id: clip._id,
      audioUrl: clip.audioUrl,
      teil: clip.teil,
      level: clip.level,
      provider: clip.provider,
      skill: clip.skill,
      title: clip.title,
    };
  }

  @Post('upload-audio')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/audio',
        filename: (req, file, cb) => {
          const timestamp = Date.now();
          const random = Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname) || getDefaultAudioExtension();
          cb(null, `listening-${timestamp}-${random}${ext}`);
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
      fileFilter: audioFileFilter,
    }),
  )
  @ApiOperation({
    summary: 'Upload audio file for listening clip',
    description: 'رفع ملف صوتي لكليب استماع وإنشاء ListeningClip في MongoDB',
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
          description: 'Provider name',
        },
        level: {
          type: 'string',
          enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
          description: 'Language level',
        },
        teil: {
          type: 'number',
          description: 'Teil number',
        },
      },
      required: ['file', 'provider', 'level', 'teil'],
    },
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Audio file uploaded and ListeningClip created successfully',
    schema: {
      type: 'object',
      properties: {
        listeningClipId: { type: 'string' },
        audioUrl: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid file or missing data' })
  async uploadAudio(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: { provider: string; level: string; teil: number },
  ) {
    if (!file) {
      throw new BadRequestException('No audio file uploaded');
    }

    if (!dto.provider || !dto.level || !dto.teil) {
      throw new BadRequestException('Missing required fields: provider, level, teil');
    }

    console.log('Saved listening clip audio at', file.path);

    const audioUrl = `/uploads/audio/${file.filename}`;

    // إنشاء ListeningClip في MongoDB
    const clip = await this.service.create({
      provider: dto.provider as any,
      level: dto.level as any,
      skill: SkillEnum.HOEREN, // Default to hoeren
      teil: Number(dto.teil),
      audioUrl,
    });

    return {
      listeningClipId: String(clip._id),
      audioUrl,
    };
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

