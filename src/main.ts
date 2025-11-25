// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { ValidationPipe, Logger, HttpException } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import basicAuth from 'express-basic-auth';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    logger.log('🚀 Starting application...');
    logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`Port: ${process.env.PORT || 4000}`);

    // Check required environment variables
    const isProduction = process.env.NODE_ENV === 'production';
    const requiredEnvVars = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      logger.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
      if (isProduction) {
        logger.error('Please set these variables in Railway environment settings');
      } else {
        logger.error('Please set these variables in your .env file or environment');
      }
      process.exit(1);
    }

    // TEACHER_EMAIL and TEACHER_PASSWORD are REQUIRED in production
    // They should be set in Railway environment variables, NOT in the code
    if (isProduction) {
      if (!process.env.TEACHER_EMAIL || !process.env.TEACHER_PASSWORD) {
        logger.error('❌ TEACHER_EMAIL and TEACHER_PASSWORD are REQUIRED in production!');
        logger.error('Please set these variables in Railway environment settings:');
        logger.error('  - TEACHER_EMAIL=teacher@deutsch-tests.com');
        logger.error('  - TEACHER_PASSWORD=<your-strong-password>');
        logger.error('');
        logger.error('Password requirements:');
        logger.error('  - At least 12 characters');
        logger.error('  - Contains uppercase, lowercase, number, and special character (@$!%*?&#)');
        process.exit(1);
      }
    } else {
      // In development, use defaults if not provided
      if (!process.env.TEACHER_EMAIL) {
        process.env.TEACHER_EMAIL = 'teacher@deutsch-tests.com';
        logger.warn(
          '⚠️  TEACHER_EMAIL not set, using default: teacher@deutsch-tests.com (development only)',
        );
      }
      if (!process.env.TEACHER_PASSWORD) {
        process.env.TEACHER_PASSWORD = 'Teacher123!@#Dev';
        logger.warn(
          '⚠️  TEACHER_PASSWORD not set, using default: Teacher123!@#Dev (development only)',
        );
      }
    }

    // Validate password strength (in both development and production)
    if (process.env.TEACHER_PASSWORD) {
      const password = process.env.TEACHER_PASSWORD;
      const minLength = password.length >= 12;
      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasNumber = /\d/.test(password);
      const hasSpecial = /[@$!%*?&#]/.test(password);

      if (!minLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
        logger.error('❌ TEACHER_PASSWORD does not meet security requirements:');
        logger.error('   - Must be at least 12 characters long');
        logger.error('   - Must contain at least one uppercase letter (A-Z)');
        logger.error('   - Must contain at least one lowercase letter (a-z)');
        logger.error('   - Must contain at least one number (0-9)');
        logger.error('   - Must contain at least one special character (@$!%*?&#)');
        if (isProduction) {
          logger.error('Please set a strong TEACHER_PASSWORD in Railway environment variables');
        }
        process.exit(1);
      }
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

    // Body size limits (5MB for JSON and form data)
    app.use(json({ limit: '5mb' }));
    app.use(urlencoded({ limit: '5mb', extended: true }));

    // CORS configuration
    const webAppOrigin = process.env.WEB_APP_ORIGIN || process.env.CORS_ORIGIN;
    const allowAllOrigins = process.env.CORS_ALLOW_ALL === 'true';

    // Default allowed origins (production domains + localhost for development)
    const defaultAllowedOrigins = [
      'http://localhost:5173', // Frontend local development (Vite default)
      'http://localhost:5174', // Frontend local development
      'http://localhost:5176', // Frontend local development
      'http://localhost:5177', // Frontend local development
      'https://deutsch-tests.com', // Production domain
      'https://www.deutsch-tests.com', // Production domain with www
      'http://localhost:3000',
      'http://localhost:5175',
      'http://localhost:5178',
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5176',
      'http://127.0.0.1:5177',
    ];

    let allowedOrigins:
      | string[]
      | boolean
      | ((origin: string, callback: (err: Error | null, allow?: boolean) => void) => void);

    if (allowAllOrigins) {
      // Allow all origins (for development/testing only)
      allowedOrigins = true;
      logger.warn(
        '⚠️  CORS: Allowing all origins (CORS_ALLOW_ALL=true). Not recommended for production!',
      );
    } else if (webAppOrigin) {
      // Split by comma and trim each origin, then merge with default origins
      const customOrigins = webAppOrigin.split(',').map((origin) => origin.trim());
      allowedOrigins = [...new Set([...defaultAllowedOrigins, ...customOrigins])]; // Remove duplicates
    } else {
      // Use default allowed origins (includes production domains + localhost)
      allowedOrigins = defaultAllowedOrigins;
    }

    app.enableCors({
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
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

    // Global logging interceptor
    app.useGlobalInterceptors(new LoggingInterceptor());

    const port = parseInt(process.env.PORT || '4000', 10);

    // Swagger documentation (optional, controlled by ENABLE_SWAGGER env var)
    const enableSwagger = process.env.ENABLE_SWAGGER === 'true';
    if (enableSwagger) {
      // Basic Auth protection for Swagger in production
      const swaggerUser = process.env.SWAGGER_USER || 'admin';
      const swaggerPassword = process.env.SWAGGER_PASSWORD || 'admin123';

      if (process.env.NODE_ENV === 'production') {
        app.use(
          '/docs',
          basicAuth({
            users: { [swaggerUser]: swaggerPassword },
            challenge: true,
            realm: 'Swagger Documentation',
          }),
        );
        logger.log(`🔒 Swagger protected with Basic Auth (user: ${swaggerUser})`);
      }

      const config = new DocumentBuilder()
        .setTitle('Quiz API')
        .setDescription('Quiz Backend API Documentation')
        .setVersion('1.0')
        .addBearerAuth(
          {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            name: 'JWT',
            description: 'Enter JWT token',
            in: 'header',
          },
          'JWT-auth',
        )
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('docs', app, document, {
        swaggerOptions: {
          persistAuthorization: true,
        },
      });
      logger.log(`✅ Swagger documentation available at: http://0.0.0.0:${port}/docs`);
    } else {
      logger.log(`ℹ️  Swagger is disabled. Set ENABLE_SWAGGER=true to enable.`);
    }

    await app.listen(port, '0.0.0.0');

    logger.log(`✅ Application is running on: http://0.0.0.0:${port}`);
    logger.log(`✅ Health check available at: http://0.0.0.0:${port}/health`);
    if (webAppOrigin) {
      logger.log(`✅ CORS enabled for: ${allowedOrigins}`);
    }
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
