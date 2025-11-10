import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private s3: S3Client;
  private bucket: string;
  private defaultExpires: number;

  constructor() {
    // التحقق من متغيرات البيئة
    const requiredEnvVars = ['S3_REGION', 'S3_ENDPOINT', 'S3_ACCESS_KEY', 'S3_SECRET_KEY', 'S3_BUCKET'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      this.logger.error(`❌ Missing S3 environment variables: ${missingVars.join(', ')}`);
      this.logger.error('Please set these variables in Railway environment settings');
    }

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
    this.defaultExpires = Number(process.env.MEDIA_DEFAULT_EXPIRES_SEC || 3600);
  }

  async uploadBuffer(opts: { buffer: Buffer; mime: string; ext?: string; prefix?: string }) {
    const key = `${opts.prefix || 'questions'}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}${opts.ext ? '.' + opts.ext : ''}`;
    try {
      // التحقق من وجود متغيرات البيئة
      if (!this.bucket || !process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY) {
        this.logger.error('S3 configuration is missing. Please check environment variables.');
        throw new InternalServerErrorException('S3 configuration is missing. Please check environment variables in Railway.');
      }

      const putCommand: any = {
        Bucket: this.bucket,
        Key: key,
        Body: opts.buffer,
        ContentType: opts.mime,
      };
      // ACL قد لا يكون مدعومًا في بعض S3-compatible storage (مثل MinIO)
      // نضيفه فقط إذا كان متوفرًا
      if (process.env.S3_USE_ACL !== 'false') {
        putCommand.ACL = 'private'; // نخليه خاص
      }
      
      this.logger.log(`Uploading file to S3: ${key} (${opts.buffer.length} bytes)`);
      await this.s3.send(new PutObjectCommand(putCommand));
      this.logger.log(`✅ File uploaded successfully: ${key}`);
      
      // public URL (هيكون غير صالح لو ACL private) - هنستخدم presign وقت العرض
      const url = `${process.env.S3_ENDPOINT?.replace(/\/+$/, '')}/${this.bucket}/${key}`;
      return { key, url, mime: opts.mime };
    } catch (e: any) {
      this.logger.error(`❌ Failed to upload media: ${e?.message || 'Unknown error'}`);
      this.logger.error(`Error details: ${JSON.stringify(e)}`);
      this.logger.error(`Stack: ${e?.stack}`);
      
      // رسالة خطأ أكثر وضوحاً
      const errorMessage = e?.message || 'Unknown error';
      if (errorMessage.includes('credentials') || errorMessage.includes('AccessDenied')) {
        throw new InternalServerErrorException('S3 credentials are invalid or insufficient permissions. Please check S3_ACCESS_KEY and S3_SECRET_KEY in Railway.');
      }
      if (errorMessage.includes('bucket') || errorMessage.includes('Bucket')) {
        throw new InternalServerErrorException(`S3 bucket "${this.bucket}" not found or inaccessible. Please check S3_BUCKET in Railway.`);
      }
      if (errorMessage.includes('endpoint') || errorMessage.includes('ENOTFOUND')) {
        throw new InternalServerErrorException(`Cannot connect to S3 endpoint "${process.env.S3_ENDPOINT}". Please check S3_ENDPOINT in Railway.`);
      }
      
      throw new InternalServerErrorException(`Failed to upload media: ${errorMessage}`);
    }
  }

  async getPresignedUrl(key: string, expiresSec?: number) {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return await getSignedUrl(this.s3, cmd, { expiresIn: expiresSec ?? this.defaultExpires });
  }
}

