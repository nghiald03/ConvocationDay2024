import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { tap, type Observable } from 'rxjs';
import { DATABASE } from '../database/database.constants.js';
import type { AppDatabase } from '../database/database.types.js';
import { auditEvents } from '../database/schema/audit-schema.js';
import type { AuthenticatedRequest } from '../common/guards/session.guard.js';

const auditedMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(@Inject(DATABASE) private readonly database: AppDatabase) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    if (!auditedMethods.has(request.method) || !request.actor) return next.handle();

    const actor = request.actor;
    return next.handle().pipe(
      tap({
        complete: () => {
          if (response.statusCode >= 400) return;
          void this.database.insert(auditEvents).values({
            action: `${request.method} ${request.path}`,
            actorId: actor.userId,
            targetType: request.baseUrl || 'api',
            targetId: String(request.params.id ?? request.params.studentCode ?? ''),
            details: { path: request.originalUrl, statusCode: response.statusCode },
          });
        },
      }),
    );
  }
}
