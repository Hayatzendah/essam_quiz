import {
  Controller,
  Post,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
  Query,
  Body,
  Res,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join, basename, resolve } from 'path';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { audioFileFilter, getDefaultAudioExtension } from '../common/utils/audio-file-validator.util';
import * as fs from 'fs';
import type { Response as ExpressResponse } from 'express';
import { MediaService } from '../modules/media/media.service';

// Filter للصور فقط
const imageFileFilter = (req: any, file: Express.Multer.File, callback: (error: Error | null, acceptFile: boolean) => void) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    return callback(new Error('Only image files are allowed!'), false);
  }
  callback(null, true);
};

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly configService: ConfigService,
    private readonly mediaService: MediaService,
  ) {}
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
          let folder = req.query.folder || 'questions';
          
          // 🔥 Decode الـ folder إذا كان encoded
          try {
            folder = decodeURIComponent(folder);
          } catch (e) {
            console.warn(`[Upload Image] Failed to decode folder: ${folder}`);
          }
          
          const destination = join(process.cwd(), 'uploads', 'images', folder);
          
          console.log(`[Upload Image] Destination folder: ${folder}`);
          console.log(`[Upload Image] Full destination path: ${destination}`);
          
          // 🔥 التأكد من وجود المجلد قبل حفظ الملف
          try {
            if (!fs.existsSync(destination)) {
              fs.mkdirSync(destination, { recursive: true });
              console.log(`[Upload Image] Created directory: ${destination}`);
            } else {
              console.log(`[Upload Image] Directory already exists: ${destination}`);
            }
            callback(null, destination);
          } catch (error: any) {
            console.error(`[Upload Image] Failed to create directory: ${destination}`, error);
            callback(new Error(`Failed to create directory: ${error.message}`), null);
          }
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

  @Post('image-from-base64')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  @ApiOperation({
    summary: 'Upload image from base64',
    description: 'رفع ملف صورة من base64 string. استخدم ?folder=ولايات لرفع صور الولايات.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        filename: { type: 'string' },
        base64: { type: 'string' },
      },
      required: ['filename', 'base64'],
    },
  })
  @ApiResponse({ status: 201, description: 'Image file uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid file' })
  async uploadImageFromBase64(
    @Body() body: { filename: string; base64: string },
    @Req() req: any,
    @Query('folder') folder?: string,
  ) {
    if (!body.filename || !body.base64) {
      throw new BadRequestException('filename and base64 are required');
    }

    try {
      // إزالة data URL prefix إذا كان موجوداً
      let base64Data = body.base64;
      if (base64Data.includes(',')) {
        base64Data = base64Data.split(',')[1];
      }

      const buffer = Buffer.from(base64Data, 'base64');
      
      // تحديد المجلد
      const imageFolder = folder || 'questions';
      const destinationDir = join(process.cwd(), 'uploads', 'images', imageFolder);
      
      // التأكد من وجود المجلد
      if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true });
      }

      const filePath = join(destinationDir, body.filename);
      fs.writeFileSync(filePath, buffer);

      console.log('Saved image file at', filePath);

      // استخدام PUBLIC_BASE_URL من environment variables
      const publicBaseUrl = this.configService.get<string>('PUBLIC_BASE_URL');
      const baseUrl = publicBaseUrl || `${req.protocol}://${req.get('host')}`;
      const imageUrl = `${baseUrl}/uploads/images/${imageFolder}/${body.filename}`;

      return { 
        imageUrl,
        filename: body.filename,
        mime: 'image/jpeg',
        key: `images/${imageFolder}/${body.filename}`,
      };
    } catch (error: any) {
      throw new BadRequestException(`Failed to save image: ${error.message}`);
    }
  }

  @Get('images/:folder/:filename')
  @ApiOperation({
    summary: 'Get image with fallback',
    description: 'يحاول جلب الصورة من disk، وإذا لم تكن موجودة يحاول من S3 أو mock URL',
  })
  async getImage(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
    @Res() res: ExpressResponse,
  ) {
    // 🔥 Decode الـ folder و filename للأحرف الخاصة
    let decodedFolder = folder;
    let decodedFilename = filename;
    
    try {
      decodedFolder = decodeURIComponent(folder);
      decodedFilename = decodeURIComponent(filename);
    } catch (e) {
      console.warn(`[Uploads Controller] Failed to decode folder/filename: ${folder}/${filename}`);
    }
    
    const filePath = resolve(process.cwd(), 'uploads', 'images', decodedFolder, decodedFilename);
    
    console.log(`[Uploads Controller] Looking for file: ${filePath}`);
    console.log(`[Uploads Controller] File exists: ${fs.existsSync(filePath)}`);
    
    // إذا الملف موجود محلياً، نخدمه مباشرة
    if (fs.existsSync(filePath)) {
      // تحديد Content-Type
      const ext = extname(decodedFilename).toLowerCase();
      const mimeTypes: { [key: string]: string } = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
      };
      const contentType = mimeTypes[ext] || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      console.log(`[Uploads Controller] Serving file: ${filePath}`);
      return res.sendFile(filePath);
    }

    // إذا الملف مش موجود، نحاول نجيب presigned URL من S3
    const key = `images/${decodedFolder}/${decodedFilename}`;
    try {
      const presignedUrl = await this.mediaService.getPresignedUrl(key, 3600);
      // Redirect للـ S3 URL
      console.log(`[Uploads Controller] Redirecting to S3: ${presignedUrl}`);
      return res.redirect(presignedUrl);
    } catch (error: any) {
      // إذا فشل S3، نرجع 404 بدلاً من redirect إلى mock
      console.error(`[Uploads Controller] File not found and S3 failed: ${error.message}`);
      throw new NotFoundException(`Image not found: ${decodedFolder}/${decodedFilename}`);
    }
  }
}

