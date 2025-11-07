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
        CORS_ORIGIN: Joi.string().default('http://localhost:5173'),
      }),
    }),

    MongooseModule.forRoot(process.env.MONGO_URI as string),

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
    });

    this.connection.on('disconnected', () => {
      this.logger.warn('⚠️ MongoDB disconnected');
    });

    // Check if already connected
    if (this.connection.readyState === 1) {
      this.logger.log('✅ Connected to MongoDB successfully');
    }
  }
}
