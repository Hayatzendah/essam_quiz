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
          if (!fs.existsSync(destination)) {
            try {
              fs.mkdirSync(destination, { recursive: true });
              console.log(`[Upload Image] Created directory: ${destination}`);
            } catch (error: any) {
              console.error(`[Upload Image] Failed to create directory: ${destination}`, error);
              const err = error instanceof Error ? error : new Error(`Failed to create directory: ${error?.message || 'Unknown error'}`);
              // في multer، callback يتوقع argumentين دائماً: (error, destination)
              return callback(err, destination);
            }
          } else {
            console.log(`[Upload Image] Directory already exists: ${destination}`);
          }
          
          // في multer، callback يأخذ (error, destination)
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

    if (!file.buffer) {
      throw new BadRequestException('File buffer is missing');
    }

    // 🔥 محاولة رفع الملف مباشرة إلى S3 أولاً
    const imageFolder = folder || 'questions';
    
    // Decode الـ folder إذا كان encoded
    let decodedFolder = imageFolder;
    try {
      decodedFolder = decodeURIComponent(imageFolder);
    } catch (e) {
      console.warn(`[Upload Image] Failed to decode folder: ${imageFolder}`);
    }

    const ext = extname(file.originalname).replace(/^\./, '').toLowerCase();
    
    try {
      // محاولة رفع إلى S3 مباشرة
      const s3Result = await this.mediaService.uploadBuffer({
        buffer: file.buffer,
        mime: file.mimetype,
        ext,
        prefix: `images/${decodedFolder}`,
      });

      console.log(`✅ File uploaded to S3: ${s3Result.key}`);

      // إذا نجح الرفع إلى S3، نرجع URL من S3
      return {
        imageUrl: s3Result.url,
        filename: file.originalname,
        mime: file.mimetype,
        key: s3Result.key,
        provider: 's3',
      };
    } catch (s3Error: any) {
      // إذا فشل S3 (مثلاً mock mode أو S3 غير متوفر)، نحفظ محلياً كـ fallback
      console.warn(`⚠️ S3 upload failed (${s3Error.message}), saving locally as fallback`);
      
      // التأكد من وجود المجلد
      const destination = join(process.cwd(), 'uploads', 'images', decodedFolder);
      if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination, { recursive: true });
        console.log(`[Upload Image] Created directory: ${destination}`);
      }

      // حفظ الملف محلياً
      const filePath = join(destination, file.originalname);
      fs.writeFileSync(filePath, file.buffer);
      console.log(`[Upload Image] Saved file locally at: ${filePath}`);

      // استخدام PUBLIC_BASE_URL من environment variables، أو بناء URL من request
      const publicBaseUrl = this.configService.get<string>('PUBLIC_BASE_URL');
      let baseUrl: string;
      
      if (publicBaseUrl) {
        baseUrl = publicBaseUrl;
      } else {
        // Fallback: بناء URL من request
        baseUrl = `${req.protocol}://${req.get('host')}`;
      }

      const imageUrl = `${baseUrl}/uploads/images/${decodedFolder}/${file.originalname}`;
      const key = `images/${decodedFolder}/${file.originalname}`;

      return { 
        imageUrl,
        filename: file.originalname,
        mime: file.mimetype,
        key,
        provider: 'local',
        warning: '⚠️ File saved locally. Files will be lost on redeploy. Please configure S3 environment variables in Railway for persistent storage.',
      };
    }
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
    description: 'يحاول جلب الصورة من disk. إذا لم تكن موجودة، يعتمد على ServeStaticModule fallthrough.',
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
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
      console.log(`[Uploads Controller] Serving file: ${filePath}`);
      return res.sendFile(filePath);
    }

    // إذا الملف مش موجود محلياً، نرجع 404
    // ServeStaticModule سيتعامل مع الطلب أولاً، وإذا لم يجد الملف، سيصل هنا
    console.error(`[Uploads Controller] File not found: ${filePath}`);
    throw new NotFoundException(`Image not found: ${decodedFolder}/${decodedFilename}`);
  }
}

