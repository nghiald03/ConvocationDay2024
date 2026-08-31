import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, asc, between, eq } from 'drizzle-orm';
import { DATABASE } from '../database/database.constants.js';
import type { AppDatabase } from '../database/database.types.js';
import { sessions } from '../database/schema/domain-schema.js';

@Injectable()
export class SessionService {
  constructor(@Inject(DATABASE) private readonly database: AppDatabase) {}

  async list() {
    return this.database
      .select({
        sessionId: sessions.id,
        session1: sessions.sessionNumber,
        sessionInDay: sessions.sessionInDay,
        description: sessions.description,
      })
      .from(sessions)
      .orderBy(asc(sessions.id));
  }

  async create(sessionNumber: number, sessionInDay?: number, description?: string) {
    const [existing] = await this.database
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.sessionNumber, sessionNumber))
      .limit(1);
    if (existing) {
      throw new BadRequestException({
        code: 'session/already-exists',
        message: 'Phiên đã tồn tại!',
      });
    }
    const [created] = await this.database
      .insert(sessions)
      .values({ sessionNumber, sessionInDay, description })
      .returning();
    return this.toLegacy(created!);
  }

  async update(id: number, sessionNumber: number, sessionInDay?: number, description?: string) {
    const [updated] = await this.database
      .update(sessions)
      .set({ sessionNumber, sessionInDay, description })
      .where(eq(sessions.id, id))
      .returning();
    return updated ? this.toLegacy(updated) : null;
  }

  async delete(id: number): Promise<boolean> {
    try {
      return (await this.database.delete(sessions).where(eq(sessions.id, id)).returning()).length > 0;
    } catch {
      return false;
    }
  }

  async autoFill(from: number, to: number): Promise<boolean> {
    const rows = await this.database
      .select({ id: sessions.id })
      .from(sessions)
      .where(between(sessions.sessionNumber, from, to))
      .orderBy(asc(sessions.sessionNumber));
    if (!rows.length) return false;
    await this.database.transaction(async (transaction) => {
      await Promise.all(
        rows.map((row, index) =>
          transaction
            .update(sessions)
            .set({ sessionInDay: index + 1 })
            .where(and(eq(sessions.id, row.id))),
        ),
      );
    });
    return true;
  }

  private toLegacy(row: typeof sessions.$inferSelect) {
    return {
      sessionId: row.id,
      session1: row.sessionNumber,
      sessionInDay: row.sessionInDay,
      description: row.description,
    };
  }
}
