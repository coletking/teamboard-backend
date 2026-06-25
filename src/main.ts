import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { mongoSanitize } from './common/middleware/mongo-sanitize.middleware';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(helmet()); // secure HTTP headers
  app.use(cookieParser()); // parse cookies (httpOnly JWT)
  app.use(mongoSanitize()); // strip NoSQL operator-injection from body/params
  app.enableCors({
    origin: config.get<string>('corsOrigin'),
    credentials: true,
  });

  // All routes are served under /api.
  app.setGlobalPrefix('api');

  // Global validation: reject unknown fields, coerce types, enforce DTOs.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Uniform error responses + 5xx logging.
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
  Logger.log(
    `API running on http://localhost:${port}/api`,
    'Bootstrap',
  );
}

void bootstrap();
