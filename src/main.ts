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

    // Body size limits (5MB for JSON and form data)
    app.use(json({ limit: '5mb' }));
    app.use(urlencoded({ limit: '5mb', extended: true }));

    // CORS configuration
    const webAppOrigin = process.env.WEB_APP_ORIGIN || process.env.CORS_ORIGIN;
    let allowedOrigins: string[] | boolean | ((origin: string, callback: (err: Error | null, allow?: boolean) => void) => void);
    
    // Default localhost origins for development
    const defaultLocalhostOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
      'http://localhost:5177',
      'http://localhost:5178',
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5177',
    ];
    
    if (webAppOrigin) {
      // Split by comma and trim each origin, then add localhost for development
      const productionOrigins = webAppOrigin.split(',').map((origin) => origin.trim());
      allowedOrigins = [...productionOrigins, ...defaultLocalhostOrigins];
    } else if (process.env.NODE_ENV === 'production') {
      // In production, if no origin is set, allow localhost for development
      allowedOrigins = defaultLocalhostOrigins;
    } else {
      // In development, allow all origins
      allowedOrigins = true;
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
