// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { ValidationPipe, Logger, HttpException } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    logger.log('🚀 Starting application...');
    logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`Port: ${process.env.PORT || 4000}`);
    
    // Check required environment variables
    const requiredEnvVars = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      logger.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
      logger.error('Please set these variables in Railway environment settings');
      process.exit(1);
    }

    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
      abortOnError: false, // Don't abort on errors, let the app start
    });

    // Configure helmet - disable CSP for test page, enable for others
    const helmetMiddleware = helmet({
      contentSecurityPolicy: false, // Disable CSP globally for now
    });
    app.use(helmetMiddleware);
    app.enableCors({
      origin: process.env.CORS_ORIGIN?.split(',') ?? true,
      credentials: true,
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        exceptionFactory: (errors) => {
          const messages = errors.map((error) => {
            const constraints = error.constraints || {};
            return Object.values(constraints).join(', ');
          });
          return new HttpException(
            {
              status: 'error',
              code: 400,
              message: 'Validation failed',
              errors: messages,
            },
            400,
          );
        },
      }),
    );

    // Global exception filter
    app.useGlobalFilters(new HttpExceptionFilter());

    const port = parseInt(process.env.PORT || '4000', 10);
    await app.listen(port, '0.0.0.0');
    
    logger.log(`✅ Application is running on: http://0.0.0.0:${port}`);
    logger.log(`✅ Health check available at: http://0.0.0.0:${port}/health`);
    logger.log(`✅ All routes mapped successfully`);
  } catch (error) {
    logger.error('❌ Failed to start application:', error);
    logger.error('Error details:', error instanceof Error ? error.stack : error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
