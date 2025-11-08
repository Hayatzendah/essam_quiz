import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { MongooseModule } from '@nestjs/mongoose';
import { Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

import { UsersModule } from './users/users.module';
import { QuestionsModule } from './questions/questions.module';
import { ExamsModule } from './exams/exams.module';
import { AttemptsModule } from './attempts/attempts.module';
import { AuthModule } from './auth/auth.module';

import { ThrottlerModule } from '@nestjs/throttler';
import { HealthController } from './health/health.controller';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(4000),
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        MONGO_URI: Joi.string().required(),
        JWT_ACCESS_SECRET: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
        JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
        CORS_ORIGIN: Joi.string().default('http://api.deutsch-tests.com'),
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
        bufferCommands: true,
        bufferMaxEntries: 0,
        // Don't fail if connection fails initially
        autoIndex: true,
        autoCreate: true,
      }),
    }),

    ThrottlerModule.forRoot([{ ttl: 60, limit: 100 }]),

    // 🟢 هذه كانت ناقصة
    UsersModule,
    QuestionsModule,
    ExamsModule,
    AttemptsModule,
    AuthModule,
  ],

  controllers: [AppController, HealthController],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger('MongoDB');

  constructor(@InjectConnection() private connection: Connection) {}

  onModuleInit() {
    this.connection.on('connected', () => {
      this.logger.log('✅ Connected to MongoDB successfully');
    });

    this.connection.on('error', (err: Error) => {
      this.logger.error(`❌ MongoDB connection error: ${err.message}`);
      this.logger.error('Please check:');
      this.logger.error('1. MONGO_URI is correct in Railway environment variables');
      this.logger.error('2. MongoDB Atlas Network Access allows connections from Railway (0.0.0.0/0)');
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
}
