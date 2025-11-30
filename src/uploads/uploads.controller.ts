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
import { extname, join } from 'path';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('Uploads')
@ApiBearerAuth('JWT-auth')
@Controller('uploads')
export class UploadsController {
  @Post('audio')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/audio',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `audio-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
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
  uploadAudio(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    console.log('Saved audio file at', file.path); // خلي الباك يطبع ده

    // بناء URL كامل للملف
    // في production، استخدم domain كامل
    const baseUrl = process.env.API_BASE_URL || '';
    const audioUrl = baseUrl 
      ? `${baseUrl}/uploads/audio/${file.filename}`
      : `/uploads/audio/${file.filename}`;

    return { audioUrl };
  }
}

