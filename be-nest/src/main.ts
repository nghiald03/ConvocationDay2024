import 'reflect-metadata';
import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { parseTrustedOrigins } from './config/environment.js';
import { validationExceptionFactory } from './common/validation/validation-exception.factory.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: new ConsoleLogger({ json: true }),
  });
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: parseTrustedOrigins(config.getOrThrow<string>('TRUSTED_ORIGINS')),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-XSRF-TOKEN', 'X-Confirm-Destructive'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      stopAtFirstError: false,
      exceptionFactory: validationExceptionFactory,
    }),
  );
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Convocation Day API')
      .setDescription('NestJS compatibility API for the Convocation Day frontend')
      .setVersion('1.0')
      .addCookieAuth('better-auth.session_token')
      .build(),
  );
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(config.getOrThrow<number>('PORT'), '0.0.0.0');
}

await bootstrap();
