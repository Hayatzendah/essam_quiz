import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join, basename } from 'path';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { audioFileFilter, getDefaultAudioExtension } from '../common/utils/audio-file-validator.util';

// Filter للصور فقط
const imageFileFilter = (req: any, file: Express.Multer.File, callback: (error: Error | null, acceptFile: boolean) => void) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    return callback(new Error('Only image files are allowed!'), false);
  }
  callback(null, true);
};

@ApiTags('Uploads')
@ApiBearerAuth('JWT-auth')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly configService: ConfigService) {}
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
  async uploadAudio(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    console.log('Saved audio file at', file.path);

    // استخدام PUBLIC_BASE_URL من environment variables، أو بناء URL من request
    const publicBaseUrl = this.configService.get<string>('PUBLIC_BASE_URL');
    let baseUrl: string;
    
    if (publicBaseUrl) {
      baseUrl = publicBaseUrl;
    } else {
      // Fallback: بناء URL من request
      baseUrl = `${req.protocol}://${req.get('host')}`;
    }

    const audioUrl = `${baseUrl}/uploads/audio/${file.filename}`;

    return { audioUrl };
  }

  @Post('image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req: any, file, callback) => {
          // تحديد المجلد بناءً على query parameter
          const folder = req.query.folder || 'questions';
          const destination = join(process.cwd(), 'uploads', 'images', folder);
          callback(null, destination);
        },
        filename: (req, file, callback) => {
          // الحفاظ على الاسم الأصلي للملف
          callback(null, file.originalname);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: imageFileFilter,
    }),
  )
  @ApiOperation({
    summary: 'Upload image file',
    description: 'رفع ملف صورة للأسئلة. استخدم ?folder=ولايات لرفع صور الولايات.',
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
  @ApiResponse({ status: 201, description: 'Image file uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid file' })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
    @Query('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    console.log('Saved image file at', file.path);

    // استخدام PUBLIC_BASE_URL من environment variables، أو بناء URL من request
    const publicBaseUrl = this.configService.get<string>('PUBLIC_BASE_URL');
    let baseUrl: string;
    
    if (publicBaseUrl) {
      baseUrl = publicBaseUrl;
    } else {
      // Fallback: بناء URL من request
      baseUrl = `${req.protocol}://${req.get('host')}`;
    }

    const imageFolder = folder || 'questions';
    const imageUrl = `${baseUrl}/uploads/images/${imageFolder}/${file.filename}`;

    return { 
      imageUrl,
      filename: file.filename,
      mime: file.mimetype,
      key: `images/${imageFolder}/${file.filename}`,
    };
  }
}

