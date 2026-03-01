import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v2 as cloudinary } from 'cloudinary';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

type StorageMode = 'cloudinary' | 's3' | 'mock';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private s3: S3Client;
  private bucket: string;
  private defaultExpires: number;
  private storageMode: StorageMode;

  constructor() {
    // 1) Cloudinary — أولوية أولى (لأن عندنا CLOUDINARY_URL)
    if (process.env.CLOUDINARY_URL) {
      this.storageMode = 'cloudinary';
      // cloudinary SDK بيقرأ CLOUDINARY_URL تلقائياً
      this.logger.log('MediaService using CLOUDINARY for file storage.');
    }
    // 2) S3
    else if (
      process.env.S3_REGION &&
      process.env.S3_ENDPOINT &&
      process.env.S3_ACCESS_KEY &&
      process.env.S3_SECRET_KEY &&
      process.env.S3_BUCKET
    ) {
      this.storageMode = 's3';
      this.s3 = new S3Client({
        region: process.env.S3_REGION,
        endpoint: process.env.S3_ENDPOINT,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY!,
          secretAccessKey: process.env.S3_SECRET_KEY!,
        },
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      });
      this.bucket = process.env.S3_BUCKET!;
      this.logger.log('MediaService using S3 for file storage.');
    }
    // 3) Mock — تخزين محلي (للتطوير فقط)
    else {
      this.storageMode = 'mock';
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn('MediaService running in MOCK MODE. Files saved locally (will be lost on redeploy).');
      }
    }

    this.defaultExpires = Number(process.env.MEDIA_DEFAULT_EXPIRES_SEC || 3600);
  }

  async uploadBuffer(opts: { buffer: Buffer; mime: string; ext?: string; prefix?: string }) {
    const key = `${opts.prefix || 'questions'}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}${opts.ext ? '.' + opts.ext : ''}`;

    // ============ CLOUDINARY ============
    if (this.storageMode === 'cloudinary') {
      try {
        this.logger.log(`Uploading to Cloudinary: ${key} (${opts.buffer.length} bytes)`);

        const result: any = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: `deutsch-tests/${opts.prefix || 'questions'}`,
              resource_type: 'auto', // auto-detect: image, video (audio), raw
              public_id: `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            },
          );
          stream.end(opts.buffer);
        });

        this.logger.log(`Uploaded to Cloudinary: ${result.public_id}`);

        return {
          key: result.public_id,
          url: result.secure_url,
          mime: opts.mime,
        };
      } catch (e: any) {
        this.logger.error(`Failed to upload to Cloudinary: ${e?.message}`);
        throw new InternalServerErrorException(`Failed to upload media: ${e?.message}`);
      }
    }

    // ============ MOCK MODE ============
    if (this.storageMode === 'mock') {
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(`MOCK MODE: Saving file locally for ${key} (${opts.buffer.length} bytes)`);
      }

      const uploadsDir = path.join(process.cwd(), 'uploads');
      const filePath = path.join(uploadsDir, key);
      const fileDir = path.dirname(filePath);

      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      fs.writeFileSync(filePath, opts.buffer);

      const baseUrl =
        process.env.PUBLIC_BASE_URL || process.env.APP_URL || process.env.API_BASE_URL || process.env.CORS_ORIGIN || 'https://api.deutsch-tests.com';
      const uploadsUrl = `${baseUrl}/uploads/${key}`;
      return { key, url: uploadsUrl, mime: opts.mime };
    }

    // ============ S3 ============
    try {
      const putCommand: any = {
        Bucket: this.bucket,
        Key: key,
        Body: opts.buffer,
        ContentType: opts.mime,
      };
      if (process.env.S3_USE_ACL !== 'false') {
        putCommand.ACL = 'private';
      }

      this.logger.log(`Uploading file to S3: ${key} (${opts.buffer.length} bytes)`);
      await this.s3.send(new PutObjectCommand(putCommand));
      this.logger.log(`File uploaded to S3: ${key}`);

      const url = `${process.env.S3_ENDPOINT?.replace(/\/+$/, '')}/${this.bucket}/${key}`;
      return { key, url, mime: opts.mime };
    } catch (e: any) {
      this.logger.error(`Failed to upload to S3: ${e?.message}`);
      throw new InternalServerErrorException(`Failed to upload media: ${e?.message}`);
    }
  }

  async getPresignedUrl(key: string, expiresSec?: number) {
    // Cloudinary URLs دائمة — ما بتنتهي
    if (this.storageMode === 'cloudinary') {
      // لو الـ key هو public_id، نبني الـ URL
      // لو الـ key هو URL كامل (يبدأ بـ http)، نرجعه مباشرة
      if (key.startsWith('http')) {
        return key;
      }
      // بناء URL من public_id
      return cloudinary.url(key, { resource_type: 'video', secure: true });
    }

    // Mock mode
    if (this.storageMode === 'mock') {
      const baseUrl =
        process.env.PUBLIC_BASE_URL || process.env.APP_URL || process.env.API_BASE_URL || process.env.CORS_ORIGIN || 'https://api.deutsch-tests.com';
      return `${baseUrl}/uploads/${key}`;
    }

    // S3 pre-signed URL
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return await getSignedUrl(this.s3, cmd, { expiresIn: expiresSec ?? this.defaultExpires });
  }
}
