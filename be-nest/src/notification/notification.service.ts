import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, lte, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DATABASE } from '../database/database.constants.js';
import type { AppDatabase } from '../database/database.types.js';
import { authUser } from '../database/schema/auth-schema.js';
import { halls, notifications, sessions } from '../database/schema/domain-schema.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import type { TtsBroadcast } from '../realtime/realtime-events.js';
import type { NotificationDto } from './dto/notification.dto.js';

const createdByUser = alias(authUser, 'created_by_user');
const broadcastByUser = alias(authUser, 'broadcast_by_user');

@Injectable()
export class NotificationService {
  constructor(
    @Inject(DATABASE) private readonly database: AppDatabase,
    private readonly realtime: RealtimeService,
  ) {}

  async list(pageIndex: number, pageSize: number, status?: string) {
    const condition = status ? eq(notifications.status, status) : undefined;
    const rows = await this.responseQuery(condition)
      .orderBy(desc(notifications.createdAt))
      .limit(pageSize)
      .offset((pageIndex - 1) * pageSize);
    const total = (
      await this.database.select({ count: count() }).from(notifications).where(condition)
    )[0]?.count ?? 0;
    return {
      notifications: rows.map((row) => this.toResponse(row)),
      totalCount: total,
      pageIndex,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async get(id: number) {
    const [row] = await this.responseQuery(eq(notifications.id, id)).limit(1);
    return row ? this.toResponse(row) : null;
  }

  async create(input: NotificationDto, actorId: string) {
    const [created] = await this.database
      .insert(notifications)
      .values({ ...input, createdBy: actorId, status: 'PENDING' })
      .returning();
    const payload = await this.broadcastPayload(created!.id, true);
    if (payload) this.realtime.broadcastTts(payload);
    this.realtime.notificationChanged(created!.id, created!.status);
    return created!;
  }

  async update(id: number, input: NotificationDto): Promise<boolean> {
    const rows = await this.database
      .update(notifications)
      .set(input)
      .where(eq(notifications.id, id))
      .returning();
    if (rows.length) this.realtime.notificationChanged(id, rows[0]!.status);
    return rows.length > 0;
  }

  async delete(id: number): Promise<boolean> {
    return (await this.database.delete(notifications).where(eq(notifications.id, id)).returning())
      .length > 0;
  }

  async transition(id: number, from: string[], status: string, actorId?: string): Promise<boolean> {
    const conditions = [eq(notifications.id, id), or(...from.map((value) => eq(notifications.status, value)))!];
    const rows = await this.database
      .update(notifications)
      .set({
        status,
        ...(status === 'BROADCASTING'
          ? { broadcastBy: actorId, broadcastAt: new Date() }
          : {}),
      })
      .where(and(...conditions))
      .returning();
    if (rows.length) this.realtime.notificationChanged(id, status);
    return rows.length > 0;
  }

  async pending(hallId?: number, sessionId?: number) {
    const filters: SQL[] = [eq(notifications.status, 'PENDING')];
    if (hallId !== undefined) filters.push(or(eq(notifications.hallId, hallId), sql`${notifications.hallId} is null`)!);
    if (sessionId !== undefined) filters.push(or(eq(notifications.sessionId, sessionId), sql`${notifications.sessionId} is null`)!);
    const rows = await this.responseQuery(and(...filters))
      .orderBy(asc(notifications.priority), asc(notifications.createdAt));
    return rows.map((row) => this.toResponse(row));
  }

  async pendingAutomatic() {
    return this.database
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.status, 'PENDING'),
          eq(notifications.isAutomatic, true),
          lte(notifications.scheduledAt, new Date()),
        ),
      );
  }

  async broadcast(id: number): Promise<TtsBroadcast | null> {
    const payload = await this.broadcastPayload(id, false);
    if (payload) this.realtime.broadcastTts(payload);
    return payload;
  }

  private responseQuery(condition?: SQL) {
    return this.database
      .select({
        notification: notifications,
        hallName: halls.name,
        sessionNumber: sessions.sessionNumber,
        createdByName: createdByUser.name,
        broadcastByName: broadcastByUser.name,
      })
      .from(notifications)
      .leftJoin(halls, eq(halls.id, notifications.hallId))
      .leftJoin(sessions, eq(sessions.id, notifications.sessionId))
      .leftJoin(createdByUser, eq(createdByUser.id, notifications.createdBy))
      .leftJoin(broadcastByUser, eq(broadcastByUser.id, notifications.broadcastBy))
      .where(condition);
  }

  private async broadcastPayload(id: number, isNewNotification: boolean): Promise<TtsBroadcast | null> {
    const notification = await this.get(id);
    if (!notification) return null;
    return {
      notificationId: notification.notificationId,
      title: notification.title,
      content: notification.content,
      priority: notification.priority,
      priorityText: notification.priorityText,
      repeatCount: notification.repeatCount,
      hallName: notification.hallName,
      sessionNumber: notification.sessionNumber,
      scope: notification.scope,
      broadcastAt: new Date().toISOString(),
      isNewNotification,
    };
  }

  private toResponse(row: Awaited<ReturnType<NotificationService['responseQuery']>>[number]) {
    const value = row.notification;
    return {
      notificationId: value.id,
      title: value.title,
      content: value.content,
      priority: value.priority,
      priorityText: this.priorityText(value.priority),
      hallId: value.hallId,
      hallName: row.hallName,
      sessionId: value.sessionId,
      sessionNumber: row.sessionNumber,
      createdBy: value.createdBy,
      createdByName: row.createdByName ?? '',
      broadcastBy: value.broadcastBy,
      broadcastByName: row.broadcastByName,
      createdAt: value.createdAt,
      scheduledAt: value.scheduledAt,
      broadcastAt: value.broadcastAt,
      status: value.status,
      isAutomatic: value.isAutomatic,
      repeatCount: value.repeatCount,
      scope: this.scope(row.hallName, row.sessionNumber),
    };
  }

  private priorityText(priority: number): string {
    return priority === 1 ? 'High' : priority === 2 ? 'Medium' : priority === 3 ? 'Low' : 'Normal';
  }

  private scope(hallName: string | null, sessionNumber: number | null): string {
    if (hallName && sessionNumber !== null) return `Hội trường ${hallName} - Đợt ${sessionNumber}`;
    if (hallName) return `Hội trường ${hallName}`;
    if (sessionNumber !== null) return `Đợt ${sessionNumber}`;
    return 'Toàn trường';
  }
}
