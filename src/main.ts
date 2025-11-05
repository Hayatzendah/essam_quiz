import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // CORS (اسمحي للفرونت يتواصل)
  app.enableCors({
    origin: true, // أو اكتبي الدومين لو عندك
    credentials: true,
  });

  // Validation لكل DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // يشيل أي حقول زيادة
      transform: true,            // يحوّل الأنواع تلقائي
      forbidNonWhitelisted: true, // يرمي خطأ لو حد بعت حقول مش مسموحة
    }),
  );

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);
  Logger.log(`Server running on http://localhost:${port}`, 'Bootstrap');
}
bootstrap();
