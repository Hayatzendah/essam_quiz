import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join, basename } from 'path';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { audioFileFilter, getDefaultAudioExtension } from '../common/utils/audio-file-validator.util';
import { AudioConverterService } from '../common/services/audio-converter.service';

@ApiTags('Uploads')
@ApiBearerAuth('JWT-auth')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly audioConverter: AudioConverterService) {}
  @Post('audio')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/audio',
        filename: (req, file, callback) => {
          const timestamp = Date.now();
          const random = Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname) || getDefaultAudioExtension();
          callback(null, `audio-${timestamp}-${random}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: audioFileFilter,
    }),
  )
  @ApiOperation({
    summary: 'Upload audio file',
    description: 'رفع ملف صوتي للأسئلة. يرجع رابط الملف.',
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
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Audio file uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid file' })
  async uploadAudio(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    console.log('Saved audio file at', file.path);

    let finalPath = file.path;
    let finalFilename = file.filename;

    // تحويل OPUS إلى MP3 تلقائياً
    const ext = extname(file.originalname).toLowerCase();
    if (ext === '.opus') {
      const convertedPath = await this.audioConverter.convertOpusToMp3(file.path);
      if (convertedPath) {
        finalPath = convertedPath;
        finalFilename = basename(convertedPath);
        console.log(`✅ Converted OPUS to MP3: ${file.filename} -> ${finalFilename}`);
        console.log(`✅ Final audioUrl will be: /uploads/audio/${finalFilename} (Content-Type: audio/mpeg)`);
      } else {
        console.warn(`❌ Failed to convert OPUS file: ${file.filename}`);
        // نرجع الملف الأصلي حتى لو فشل التحويل
      }
    }

    // استخدام مسار نسبي فقط (بدون baseUrl) لأن الفرونت سيبني الـ URL الكامل
    const audioUrl = `/uploads/audio/${finalFilename}`;

    return { audioUrl };
  }
}

