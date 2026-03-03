import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { MongooseModule } from '@nestjs/mongoose';
import { Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

import { UsersModule } from './users/users.module';
import { QuestionsModule } from './questions/questions.module';
import { ExamsModule } from './exams/exams.module';
import { AttemptsModule } from './attempts/attempts.module';
import { AuthModule } from './auth/auth.module';
import { MediaModule } from './modules/media/media.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { GrammarModule } from './modules/grammar/grammar.module';
import { SchreibenModule } from './modules/schreiben/schreiben.module';
import { UploadsModule } from './uploads/uploads.module';
import { ListeningClipsModule } from './listening-clips/listening-clips.module';
import { AdminModule } from './admin/admin.module';
import { VocabularyModule } from './vocabulary/vocabulary.module';
import { LevelsModule } from './levels/levels.module';
import { NounsModule } from './nouns/nouns.module';

import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthController } from './health/health.controller';
import { AppController } from './app.controller';
import { EnumsController } from './common/enums.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(4000),
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .empty('')
          .default('development'),
        MONGO_URI: Joi.string().required(),
        JWT_ACCESS_SECRET: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
        JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
        WEB_APP_ORIGIN: Joi.string().optional(),
        CORS_ORIGIN: Joi.string().optional(), // Fallback for backward compatibility
        CORS_ALLOW_ALL: Joi.string().valid('true', 'false').optional(), // Allow all origins (for development only)
        ENABLE_SWAGGER: Joi.string().valid('true', 'false').default('false'),
        SWAGGER_USER: Joi.string().optional(),
        SWAGGER_PASSWORD: Joi.string().optional(),
        SECRET_RANDOM_SERVER: Joi.string().optional(),
        // Teacher authentication (required in production, optional in development)
        TEACHER_EMAIL: Joi.string().email().optional(),
        TEACHER_PASSWORD: Joi.string()
          .min(12)
          .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
          .optional()
          .messages({
            'string.min': 'TEACHER_PASSWORD must be at least 12 characters long',
            'string.pattern.base':
              'TEACHER_PASSWORD must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#)',
          }),
        // S3/Media configuration (optional - will use mock mode if not set)
        S3_REGION: Joi.string().optional(),
        S3_ENDPOINT: Joi.string().optional(),
        S3_ACCESS_KEY: Joi.string().optional(),
        S3_SECRET_KEY: Joi.string().optional(),
        S3_BUCKET: Joi.string().optional(),
        MEDIA_USE_MOCK: Joi.string().valid('true', 'false').optional(),
        // App URL and file paths
        APP_URL: Joi.string().uri().optional().default('https://api.deutsch-tests.com'),
        PUBLIC_BASE_URL: Joi.string().uri().optional().default('https://api.deutsch-tests.com'),
        FILES_BASE_PATH: Joi.string().optional().default('/uploads/audio'),
      }),
    }),

    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGO_URI as string,
        retryWrites: true,
        w: 'majority',
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        maxPoolSize: 10,
        minPoolSize: 1,
        // Don't fail if connection fails initially
        autoIndex: true,
        autoCreate: true,
      }),
    }),

    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]), // 100 requests per minute per IP

    ScheduleModule.forRoot(), // Cron jobs

    CacheModule.register({
      ttl: 10_000, // 10 seconds
      max: 100, // maximum number of items in cache
    }),

    // Serve static files from uploads directory
    // 🔥 Important: Make sure uploads directories are created BEFORE this module loads
    // (see main.ts bootstrap function for directory creation)
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'), // ✅ Uses process.cwd() - works in containers
      serveRoot: '/uploads',
      serveStaticOptions: {
        index: false, // ✅ لا تبحث عن index.html - يمنع ENOENT stat /app/uploads/index.html
        fallthrough: false, // ✅ لا تمرر للـ route التالي - يرجع 404 مباشرة إذا لم يجد الملف
        dotfiles: 'ignore', // تجاهل الملفات المخفية
        redirect: false, // لا تعمل redirect للمسارات
        setHeaders: (res, path) => {
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Accept-Ranges', 'bytes'); // دعم Range requests

          // تحديد Content-Type بناءً على extension الملف
          const lowerPath = path.toLowerCase();
          if (lowerPath.endsWith('.opus')) {
            // Note: OPUS files are now converted to MP3, but we keep this for legacy files
            // Use audio/ogg for better browser compatibility (OPUS is usually in OGG container)
            res.setHeader('Content-Type', 'audio/ogg; codecs=opus');
          } else if (lowerPath.endsWith('.ogg')) {
            res.setHeader('Content-Type', 'audio/ogg');
          } else if (lowerPath.endsWith('.mp3')) {
            res.setHeader('Content-Type', 'audio/mpeg');
          } else if (lowerPath.endsWith('.wav')) {
            res.setHeader('Content-Type', 'audio/wav');
          } else if (lowerPath.endsWith('.m4a')) {
            res.setHeader('Content-Type', 'audio/mp4');
          } else if (lowerPath.endsWith('.aac')) {
            res.setHeader('Content-Type', 'audio/aac');
          } else if (lowerPath.endsWith('.webm')) {
            res.setHeader('Content-Type', 'audio/webm');
          } else if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) {
            res.setHeader('Content-Type', 'image/jpeg');
          } else if (lowerPath.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
          } else if (lowerPath.endsWith('.gif')) {
            res.setHeader('Content-Type', 'image/gif');
          } else if (lowerPath.endsWith('.webp')) {
            res.setHeader('Content-Type', 'image/webp');
          }
          // إذا لم يكن audio/image file، express.static سيتعامل معه تلقائياً
        },
      },
    }),

    // 🟢 هذه كانت ناقصة
    UsersModule,
    QuestionsModule,
    ExamsModule,
    AttemptsModule,
    AuthModule,
    MediaModule,
    AnalyticsModule,
    GrammarModule,
    SchreibenModule,
    UploadsModule,
    ListeningClipsModule,
    AdminModule,
    VocabularyModule,
    LevelsModule,
    NounsModule,
  ],

  controllers: [AppController, HealthController, EnumsController],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger('MongoDB');

  constructor(@InjectConnection() private connection: Connection) {}

  onModuleInit() {
    // إنشاء مجلدات uploads إذا لم تكن موجودة
    this.ensureUploadsDirectories();

    this.connection.on('connected', () => {
      this.logger.log('✅ Connected to MongoDB successfully');
    });

    this.connection.on('error', (err: Error) => {
      this.logger.error(`❌ MongoDB connection error: ${err.message}`);
      this.logger.error('Please check:');
      this.logger.error('1. MONGO_URI is correct in Railway environment variables');
      this.logger.error(
        '2. MongoDB Atlas Network Access allows connections from Railway (0.0.0.0/0)',
      );
      this.logger.error('3. MongoDB username and password are correct');
    });

    this.connection.on('disconnected', () => {
      this.logger.warn('⚠️ MongoDB disconnected');
    });

    this.connection.on('connecting', () => {
      this.logger.log('🔄 Connecting to MongoDB...');
    });

    // Check if already connected
    if (this.connection.readyState === 1) {
      this.logger.log('✅ Connected to MongoDB successfully');
    } else if (this.connection.readyState === 0) {
      this.logger.warn('⚠️ MongoDB connection not established yet');
    }
  }

  /**
   * التأكد من وجود مجلدات uploads
   */
  private ensureUploadsDirectories() {
    const uploadsDir = join(process.cwd(), 'uploads');
    const audioDir = join(uploadsDir, 'audio');
    const recordingsDir = join(uploadsDir, 'recordings');
    const questionsDir = join(uploadsDir, 'questions'); // 🔥 مجلد ملفات الأسئلة (من MediaService)
    const studentRecordingsDir = join(uploadsDir, 'student-recordings'); // 🔥 مجلد تسجيلات الطلاب
    const imagesDir = join(uploadsDir, 'images'); // 🔥 مجلد images العام
    const imagesQuestionsDir = join(uploadsDir, 'images', 'questions');
    const imagesProfilePicturesDir = join(uploadsDir, 'images', 'profile-pictures');
    const imagesStatesDir = join(uploadsDir, 'images', 'ولايات'); // 🔥 مجلد أسئلة الولايات

    try {
      // إنشاء مجلد uploads إذا لم يكن موجوداً
      if (!existsSync(uploadsDir)) {
        mkdirSync(uploadsDir, { recursive: true });
        this.logger.log(`✅ Created uploads directory: ${uploadsDir}`);
      }

      // إنشاء مجلد audio إذا لم يكن موجوداً
      if (!existsSync(audioDir)) {
        mkdirSync(audioDir, { recursive: true });
        this.logger.log(`✅ Created audio directory: ${audioDir}`);
      }

      // إنشاء مجلد recordings إذا لم يكن موجوداً
      if (!existsSync(recordingsDir)) {
        mkdirSync(recordingsDir, { recursive: true });
        this.logger.log(`✅ Created recordings directory: ${recordingsDir}`);
      }

      // 🔥 إنشاء مجلد questions (يستخدمه MediaService للملفات الصوتية والصور)
      if (!existsSync(questionsDir)) {
        mkdirSync(questionsDir, { recursive: true });
        this.logger.log(`✅ Created questions directory: ${questionsDir}`);
      }

      // 🔥 إنشاء مجلد student-recordings (يستخدمه MediaService لتسجيلات الطلاب)
      if (!existsSync(studentRecordingsDir)) {
        mkdirSync(studentRecordingsDir, { recursive: true });
        this.logger.log(`✅ Created student-recordings directory: ${studentRecordingsDir}`);
      }

      // 🔥 إنشاء مجلد images العام (مهم لـ ServeStaticModule)
      if (!existsSync(imagesDir)) {
        mkdirSync(imagesDir, { recursive: true });
        this.logger.log(`✅ Created images directory: ${imagesDir}`);
      }

      // إنشاء مجلد images/questions إذا لم يكن موجوداً
      if (!existsSync(imagesQuestionsDir)) {
        mkdirSync(imagesQuestionsDir, { recursive: true });
        this.logger.log(`✅ Created images/questions directory: ${imagesQuestionsDir}`);
      }

      // إنشاء مجلد images/profile-pictures إذا لم يكن موجوداً
      if (!existsSync(imagesProfilePicturesDir)) {
        mkdirSync(imagesProfilePicturesDir, { recursive: true });
        this.logger.log(`✅ Created images/profile-pictures directory: ${imagesProfilePicturesDir}`);
      }

      // 🔥 إنشاء مجلد images/ولايات إذا لم يكن موجوداً (مثل questions)
      if (!existsSync(imagesStatesDir)) {
        mkdirSync(imagesStatesDir, { recursive: true });
        this.logger.log(`✅ Created images/ولايات directory: ${imagesStatesDir}`);
      }

      this.logger.log(`✅ Uploads directories ready: ${uploadsDir}`);
    } catch (error) {
      this.logger.error(`❌ Failed to create uploads directories: ${error}`);
      this.logger.error(
        'Please ensure the application has write permissions to create directories',
      );
    }
  }
}
