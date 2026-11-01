import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { tap, type Observable } from 'rxjs';
import { DATABASE } from '../database/database.constants.js';
import type { AppDatabase } from '../database/database.types.js';
import { auditEvents } from '../database/schema/audit-schema.js';
import type { AuthenticatedRequest } from '../common/guards/session.guard.js';

const auditedMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Check-in endpoints carry the student code in the body or query, not the route params.
function auditTarget(request: AuthenticatedRequest): string {
  const params = request.params as Record<string, string | undefined>;
  const body = (request.body ?? {}) as Record<string, unknown>;
  const query = request.query as Record<string, unknown>;
  const candidate =
    params.id ??
    params.studentCode ??
    params.hallId ??
    params.sessionId ??
    body.studentCode ??
    query.studentCode;
  return typeof candidate === 'string' || typeof candidate === 'number' ? String(candidate) : '';
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

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
          // Drizzle queries are lazy: without then()/await the insert is never sent.
          this.database
            .insert(auditEvents)
            .values({
              action: `${request.method} ${request.path}`,
              actorId: actor.userId,
              targetType: request.baseUrl || 'api',
              targetId: auditTarget(request),
              details: { path: request.originalUrl, statusCode: response.statusCode },
            })
            .then(undefined, (error: unknown) => {
              this.logger.error(`Không ghi được audit cho ${request.method} ${request.path}`, error);
            });
        },
      }),
    );
  }
}
