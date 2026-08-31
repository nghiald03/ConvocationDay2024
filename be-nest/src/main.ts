import 'reflect-metadata';
import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { parseTrustedOrigins } from './config/environment.js';
import { validationExceptionFactory } from './common/validation/validation-exception.factory.js';

const httpMethods = ['get', 'post', 'put', 'patch', 'delete'] as const;

function enrichOpenApiExamples(document: OpenAPIObject): void {
  const standardErrors = {
    400: {
      description: 'Dữ liệu gửi lên không hợp lệ.',
      content: {
        'application/json': {
          example: {
            code: 'request/validation-failed',
            message: 'Dữ liệu gửi lên không hợp lệ.',
            details: ['Trường dữ liệu không hợp lệ.'],
          },
        },
      },
    },
    401: {
      description: 'Chưa đăng nhập hoặc session không hợp lệ.',
      content: {
        'application/json': {
          example: { code: 'auth/unauthorized', message: 'Bạn cần đăng nhập để tiếp tục.' },
        },
      },
    },
    403: {
      description: 'Không có quyền thực hiện thao tác.',
      content: {
        'application/json': {
          example: { code: 'auth/forbidden', message: 'Bạn không có quyền thực hiện thao tác này.' },
        },
      },
    },
    500: {
      description: 'Lỗi hệ thống không mong muốn.',
      content: {
        'application/json': {
          example: { code: 'server/internal-error', message: 'Đã xảy ra lỗi không mong muốn.' },
        },
      },
    },
  } as const;

  for (const pathItem of Object.values(document.paths)) {
    if (!pathItem) continue;
    for (const method of httpMethods) {
      const operation = pathItem[method];
      if (!operation) continue;
      for (const [status, response] of Object.entries(operation.responses)) {
        if (!response || '$ref' in response || status === '204' || response.content) continue;
        const statusNumber = Number(status);
        response.content = {
          'application/json': {
            example: {
              status: Number.isFinite(statusNumber) ? statusNumber : 200,
              message: 'Yêu cầu được xử lý thành công.',
            },
          },
        };
      }
      for (const [status, response] of Object.entries(standardErrors)) {
        operation.responses[status] ??= response;
      }
    }
  }
}

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
  enrichOpenApiExamples(document);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(config.getOrThrow<number>('PORT'), '0.0.0.0');
}

await bootstrap();
