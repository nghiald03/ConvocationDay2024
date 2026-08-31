import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { finalize, type Observable } from 'rxjs';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const started = performance.now();
    return next.handle().pipe(
      finalize(() => {
        this.logger.log('Request handled', {
          method: request.method,
          path: request.originalUrl,
          durationMs: Math.round((performance.now() - started) * 100) / 100,
        });
      }),
    );
  }
}
