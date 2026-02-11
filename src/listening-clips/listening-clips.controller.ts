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
import { extname, join, basename } from 'path';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ListeningClipsService } from './listening-clips.service';
import { CreateListeningClipDto } from './dto/create-listening-clip.dto';
import { SkillEnum } from './schemas/listening-clip.schema';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { audioFileFilter, getDefaultAudioExtension } from '../common/utils/audio-file-validator.util';
import { AudioConverterService } from '../common/services/audio-converter.service';
import { MediaService } from '../modules/media/media.service';
import * as fs from 'fs';

@ApiTags('Listening Clips')
@ApiBearerAuth('JWT-auth')
@Controller(['listening-clips', 'listeningclips']) // دعم كلا المسارين
export class ListeningClipsController {
  constructor(
    private readonly service: ListeningClipsService,
    private readonly audioConverter: AudioConverterService,
    private readonly mediaService: MediaService,
  ) {}

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

    console.log('Saved listening clip at', file.path);

    // تحويل OPUS/OGG إلى MP3 إذا لزم الأمر
    let finalPath = file.path;
    let finalFilename = file.filename;
    const ext = extname(file.filename).toLowerCase();

    if (ext === '.opus' || ext === '.ogg') {
      const convertedPath = await this.audioConverter.convertOpusToMp3(file.path);
      if (convertedPath) {
        finalPath = convertedPath;
        finalFilename = file.filename.replace(/\.(opus|ogg)$/i, '.mp3');
        console.log(`Converted ${ext} to MP3: ${finalFilename}`);
      } else {
        console.warn(`Failed to convert ${ext} to MP3, using original file`);
      }
    }

    // رفع الملف على S3 للتخزين الدائم (بدل التخزين المحلي اللي بينمحي مع كل deploy)
    const fileBuffer = fs.readFileSync(finalPath);
    const finalExt = extname(finalFilename).replace(/^\./, '').toLowerCase();
    const mime = finalExt === 'mp3' ? 'audio/mpeg' : (file.mimetype || 'audio/mpeg');

    const s3Result = await this.mediaService.uploadBuffer({
      buffer: fileBuffer,
      mime,
      ext: finalExt,
      prefix: 'audio',
    });

    // حذف الملف المحلي بعد الرفع على S3
    try { fs.unlinkSync(finalPath); } catch (e) { /* ignore */ }

    const audioUrl = s3Result.url;
    dto.audioUrl = audioUrl;
    const clip = await this.service.create(dto);

    const response: any = {
      _id: clip._id,
      audioUrl: clip.audioUrl,
      teil: clip.teil,
      level: clip.level,
      provider: clip.provider,
      skill: clip.skill,
      title: clip.title,
      audioSources: [
        { url: audioUrl, type: mime, format: finalExt },
      ],
    };

    return response;
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
      required: ['file'],
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
    @Body() dto: { provider?: string; level?: string; teil?: number; title?: string },
  ) {
    if (!file) {
      throw new BadRequestException('No audio file uploaded');
    }

    console.log('Saved listening clip audio at', file.path);

    // تحويل OPUS/OGG إلى MP3 إذا لزم الأمر
    let finalPath = file.path;
    let finalFilename = file.filename;
    const ext = extname(file.filename).toLowerCase();

    if (ext === '.opus' || ext === '.ogg') {
      const convertedPath = await this.audioConverter.convertOpusToMp3(file.path);
      if (convertedPath) {
        finalPath = convertedPath;
        finalFilename = file.filename.replace(/\.(opus|ogg)$/i, '.mp3');
        console.log(`Converted ${ext} to MP3: ${finalFilename}`);
      } else {
        console.warn(`Failed to convert ${ext} to MP3, using original file`);
      }
    }

    // رفع الملف على S3 للتخزين الدائم
    const fileBuffer = fs.readFileSync(finalPath);
    const finalExt = extname(finalFilename).replace(/^\./, '').toLowerCase();
    const mime = finalExt === 'mp3' ? 'audio/mpeg' : (file.mimetype || 'audio/mpeg');

    const s3Result = await this.mediaService.uploadBuffer({
      buffer: fileBuffer,
      mime,
      ext: finalExt,
      prefix: 'audio',
    });

    // حذف الملف المحلي بعد الرفع على S3
    try { fs.unlinkSync(finalPath); } catch (e) { /* ignore */ }

    const audioUrl = s3Result.url;

    // إنشاء ListeningClip في MongoDB
    const clip = await this.service.create({
      provider: (dto.provider || 'goethe') as any,
      level: (dto.level || 'A1') as any,
      skill: SkillEnum.HOEREN,
      teil: Number(dto.teil) || 1,
      audioUrl,
      ...(dto.title && { title: dto.title }),
    });

    return {
      listeningClipId: String(clip._id),
      audioUrl,
      audioSources: [
        { url: audioUrl, type: mime, format: finalExt },
      ],
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

