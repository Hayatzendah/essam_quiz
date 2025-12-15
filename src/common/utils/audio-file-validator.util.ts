import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';

/**
 * الصيغ الصوتية المدعومة (متوافقة مع جميع المتصفحات والأجهزة)
 */
export const ALLOWED_AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.aac'] as const;
export const ALLOWED_AUDIO_MIMETYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/aac',
  'audio/aacp',
] as const;

/**
 * التحقق من أن الملف الصوتي بصيغة مدعومة
 * @param file - ملف Multer
 * @returns true إذا كان الملف مدعوم، false إذا كان OPUS أو غير مدعوم
 */
export function isAllowedAudioFile(file: Express.Multer.File): boolean {
  const ext = extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype.toLowerCase();

  // رفض OPUS صراحة
  if (ext === '.opus' || mimetype.includes('opus')) {
    return false;
  }

  // التحقق من الصيغة
  const hasAllowedExtension = ALLOWED_AUDIO_EXTENSIONS.some((allowed) => ext === allowed);
  const hasAllowedMimetype = ALLOWED_AUDIO_MIMETYPES.some((allowed) =>
    mimetype === allowed || mimetype.includes(allowed),
  );

  return hasAllowedExtension || hasAllowedMimetype;
}

/**
 * fileFilter للاستخدام مع multer
 * يرفض OPUS والسماح فقط بـ MP3, M4A, WAV, AAC
 */
export function audioFileFilter(
  req: any,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  // التحقق من أن الملف صوتي
  if (!/^audio\//.test(file.mimetype)) {
    return callback(
      new BadRequestException('Only audio files are allowed') as any,
      false,
    );
  }

  // التحقق من أن الصيغة مدعومة (رفض OPUS)
  if (!isAllowedAudioFile(file)) {
    return callback(
      new BadRequestException(
        'OPUS format is not supported. Please use MP3, M4A, WAV, or AAC format for better browser compatibility.',
      ) as any,
      false,
    );
  }

  callback(null, true);
}

/**
 * الحصول على extension افتراضي (MP3 بدلاً من OPUS)
 */
export function getDefaultAudioExtension(): string {
  return '.mp3';
}

