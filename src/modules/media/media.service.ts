import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';

@Injectable()
export class MediaService {
  private s3 = new S3Client({
    region: process.env.S3_REGION,
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  });

  private bucket = process.env.S3_BUCKET!;
  private defaultExpires = Number(process.env.MEDIA_DEFAULT_EXPIRES_SEC || 3600);

  async uploadBuffer(opts: { buffer: Buffer; mime: string; ext?: string; prefix?: string }) {
    const key = `${opts.prefix || 'questions'}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}${opts.ext ? '.' + opts.ext : ''}`;
    try {
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
      await this.s3.send(new PutObjectCommand(putCommand));
      // public URL (هيكون غير صالح لو ACL private) - هنستخدم presign وقت العرض
      const url = `${process.env.S3_ENDPOINT?.replace(/\/+$/, '')}/${this.bucket}/${key}`;
      return { key, url, mime: opts.mime };
    } catch (e) {
      throw new InternalServerErrorException('Failed to upload media');
    }
  }

  async getPresignedUrl(key: string, expiresSec?: number) {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return await getSignedUrl(this.s3, cmd, { expiresIn: expiresSec ?? this.defaultExpires });
  }
}

