import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: '4mb' }));
  app.use(urlencoded({ extended: true, limit: '4mb' }));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS — comma-separated FRONTEND_URL allowed (e.g. prod + localhost)
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
        return;
      }
      // Always allow Snapcut Vercel deploys even if FRONTEND_URL wasn't updated
      if (/^https:\/\/([a-z0-9-]+\.)*vercel\.app$/i.test(origin)) {
        callback(null, true);
        return;
      }
      if (origin === 'https://snap-cut-ud2a.vercel.app') {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Snapcut API running on: http://localhost:${port}/api`);
}
bootstrap();
