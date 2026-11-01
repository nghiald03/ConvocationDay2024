import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { and, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import { Permission } from '../auth/permissions.js';
import { RequirePermissions } from '../common/guards/require-permissions.decorator.js';
import { DATABASE } from '../database/database.constants.js';
import type { AppDatabase } from '../database/database.types.js';
import { auditEvents } from '../database/schema/audit-schema.js';
import { authUser } from '../database/schema/auth-schema.js';

export class AuditQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize = 50;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  actorId?: string;

  // Matches the action (method + path) or the actor's name/email.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}

@ApiTags('audit')
@Controller('Audit')
@RequirePermissions(Permission.ManageSystem)
export class AuditController {
  constructor(@Inject(DATABASE) private readonly database: AppDatabase) {}

  @Get()
  async list(@Query() query: AuditQueryDto) {
    const filters: SQL[] = [];
    if (query.actorId) filters.push(eq(auditEvents.actorId, query.actorId));
    const search = query.q?.trim();
    if (search) {
      const pattern = `%${search.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
      filters.push(
        or(
          ilike(auditEvents.action, pattern),
          ilike(auditEvents.targetId, pattern),
          ilike(authUser.name, pattern),
          ilike(authUser.email, pattern),
        )!,
      );
    }
    const where = filters.length ? and(...filters) : undefined;

    const [items, [total]] = await Promise.all([
      this.database
        .select({
          id: auditEvents.id,
          action: auditEvents.action,
          targetType: auditEvents.targetType,
          targetId: auditEvents.targetId,
          details: auditEvents.details,
          createdAt: auditEvents.createdAt,
          actorId: auditEvents.actorId,
          actorName: authUser.name,
          actorEmail: authUser.email,
        })
        .from(auditEvents)
        .leftJoin(authUser, eq(authUser.id, auditEvents.actorId))
        .where(where)
        .orderBy(desc(auditEvents.createdAt), desc(auditEvents.id))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      this.database
        .select({ value: count() })
        .from(auditEvents)
        .leftJoin(authUser, eq(authUser.id, auditEvents.actorId))
        .where(where),
    ]);
    return { items, total: total?.value ?? 0, page: query.page, pageSize: query.pageSize };
  }
}
