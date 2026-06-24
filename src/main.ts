import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { mongoSanitize } from './common/middleware/mongo-sanitize.middleware';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(helmet());
  app.use(mongoSanitize());
  app.enableCors({
    origin: config.get<string>('corsOrigin'),
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
  Logger.log(
    `🚀 TeamBoard API running on http://localhost:${port}/api`,
    'Bootstrap',
  );
}

void bootstrap();
