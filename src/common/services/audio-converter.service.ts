import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { unlink, existsSync } from 'fs';
import { join, extname, dirname } from 'path';
import ffmpeg from 'fluent-ffmpeg';

const execAsync = promisify(exec);
const unlinkAsync = promisify(unlink);

@Injectable()
export class AudioConverterService {
  private readonly logger = new Logger(AudioConverterService.name);

  /**
   * تحويل ملف OPUS أو OGG إلى MP3
   * @param inputPath - مسار الملف الأصلي
   * @returns مسار الملف المحول (MP3) أو null إذا فشل التحويل أو الملف ليس OPUS/OGG
   */
  async convertOpusToMp3(inputPath: string): Promise<string | null> {
    try {
      // التحقق من أن الملف OPUS أو OGG
      const ext = extname(inputPath).toLowerCase();
      if (ext !== '.opus' && ext !== '.ogg') {
        this.logger.warn(`File ${inputPath} is not OPUS or OGG, skipping conversion`);
        return null;
      }

      // إنشاء مسار الملف المحول (MP3)
      const outputPath = inputPath.replace(/\.(opus|ogg)$/i, '.mp3');

      this.logger.log(`Converting ${ext.toUpperCase()} to MP3: ${inputPath} -> ${outputPath}`);

      // التحويل باستخدام FFmpeg
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .audioCodec('libmp3lame')
          .audioBitrate(128) // 128 kbps - جودة جيدة وحجم معقول
          .audioChannels(2) // Stereo
          .audioFrequency(44100) // 44.1 kHz - جودة CD
          .format('mp3')
          .on('start', (commandLine) => {
            this.logger.debug(`FFmpeg command: ${commandLine}`);
          })
          .on('progress', (progress) => {
            if (progress.percent) {
              this.logger.debug(`Conversion progress: ${Math.round(progress.percent)}%`);
            }
          })
          .on('end', () => {
            this.logger.log(`✅ Successfully converted to MP3: ${outputPath}`);
            resolve();
          })
          .on('error', (err) => {
            this.logger.error(`❌ FFmpeg conversion error: ${err.message}`, err.stack);
            reject(err);
          })
          .save(outputPath);
      });

      // التحقق من وجود الملف المحول
      if (!existsSync(outputPath)) {
        this.logger.error(`Converted file not found: ${outputPath}`);
        return null;
      }

      // حذف الملف الأصلي (OPUS أو OGG)
      try {
        await unlinkAsync(inputPath);
        this.logger.log(`Deleted original file: ${inputPath}`);
      } catch (deleteError) {
        this.logger.warn(`Failed to delete original file: ${deleteError}`);
        // لا نرفض العملية إذا فشل الحذف
      }

      return outputPath;
    } catch (error) {
      this.logger.error(`Failed to convert to MP3: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * تحويل ملف OGG أو OPUS إلى MP3 (اسم بديل للتوافق)
   * @param inputPath - مسار الملف الأصلي
   * @returns مسار الملف المحول (MP3) أو null إذا فشل التحويل
   */
  async convertToMp3IfNeeded(inputPath: string): Promise<string> {
    const ext = extname(inputPath).toLowerCase();
    if (ext === '.ogg' || ext === '.opus') {
      const convertedPath = await this.convertOpusToMp3(inputPath);
      return convertedPath || inputPath; // إذا فشل التحويل، نرجع المسار الأصلي
    }
    return inputPath; // ليس OGG أو OPUS، نرجع المسار كما هو
  }

  /**
   * التحقق من وجود FFmpeg في النظام
   */
  async checkFfmpegAvailable(): Promise<boolean> {
    try {
      await execAsync('ffmpeg -version');
      return true;
    } catch (error) {
      this.logger.warn('FFmpeg is not available in the system');
      return false;
    }
  }
}

