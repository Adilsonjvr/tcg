import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { setDefaultResultOrder } from 'dns';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    setDefaultResultOrder?.('ipv4first');
  } catch {
    // Node < 17 or other environments may not support this flag.
  }
  const app = await NestFactory.create(AppModule);
  app.use(
    json({
      limit: '1mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(
    urlencoded({
      limit: '1mb',
      extended: true,
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
