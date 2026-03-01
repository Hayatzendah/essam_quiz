import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';

/**
 * الصيغ الصوتية المدعومة (متوافقة مع جميع المتصفحات والأجهزة)
 */
export const ALLOWED_AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.aac', '.opus', '.ogg'] as const;
export const ALLOWED_AUDIO_MIMETYPES = [
  'audio/mpeg',       // mp3
  'audio/mp3',
  'audio/mp4',        // m4a
  'audio/x-m4a',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/aac',
  'audio/aacp',
  'audio/opus',       // opus
  'audio/ogg',        // ogg container
  'application/ogg',  // ogg container (alternative mime type)
] as const;

/**
 * التحقق من أن الملف الصوتي بصيغة مدعومة
 * @param file - ملف Multer (diskStorage أو memoryStorage)
 * @returns true إذا كان الملف مدعوم، false إذا كان غير مدعوم
 * ملاحظة: OPUS و OGG مسموحان الآن (سيتم تحويلهما تلقائياً إلى MP3)
 */
export function isAllowedAudioFile(file: { originalname: string; mimetype: string }): boolean {
  const ext = extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype.toLowerCase();

  // السماح بـ OPUS و OGG (سيتم تحويلهما تلقائياً)
  if (ext === '.opus' || ext === '.ogg' || mimetype.includes('opus') || mimetype.includes('ogg')) {
    return true;
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
 * يسمح بـ MP3, M4A, WAV, AAC, OPUS, OGG (OPUS و OGG سيتم تحويلهما تلقائياً إلى MP3)
 */
export function audioFileFilter(
  req: any,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  // التحقق من أن الملف صوتي
  if (!/^audio\//.test(file.mimetype) && !file.mimetype.includes('ogg') && file.mimetype !== 'application/ogg') {
    return callback(
      new BadRequestException('Only audio files are allowed') as any,
      false,
    );
  }

  const ext = extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype.toLowerCase();

  // السماح بـ OPUS و OGG (سيتم تحويلهما تلقائياً)
  if (ext === '.opus' || ext === '.ogg' || mimetype.includes('opus') || mimetype.includes('ogg')) {
    callback(null, true);
    return;
  }

  // التحقق من أن الصيغة مدعومة
  if (!isAllowedAudioFile(file)) {
    return callback(
      new BadRequestException(
        'Unsupported audio format. Please use MP3, M4A, WAV, AAC, OPUS, or OGG format.',
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

