import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // All HTTP API routes live under /api, so the same origin can also serve the SPA.
  app.setGlobalPrefix('api');
  const allowedOrigins = (config.get<string>('ALLOWED_ORIGIN') ?? 'http://127.0.0.1:5173,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(json({ limit: '12mb' }));
  app.use(urlencoded({ limit: '12mb', extended: true }));

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      // Never throw — Express turns a thrown CORS error into a 500 (a real gotcha).
      // Disallowing cleanly lets same-origin requests through and blocks others normally.
      callback(null, false);
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = config.get<number>('PORT') ?? 4000;
  await app.listen(port);
}

bootstrap();
