import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DATABASE } from '../database/database.constants.js';
import type { AppDatabase } from '../database/database.types.js';
import { bachelors } from '../database/schema/domain-schema.js';
import { RealtimeService } from '../realtime/realtime.service.js';

@Injectable()
export class LedService {
  constructor(
    @Inject(DATABASE) private readonly database: AppDatabase,
    private readonly realtime: RealtimeService,
  ) {}

  async location(studentCode: string) {
    const [row] = await this.database
      .select()
      .from(bachelors)
      .where(eq(bachelors.studentCode, studentCode))
      .limit(1);
    return row ?? null;
  }

  async allLocations() {
    return this.database
      .select()
      .from(bachelors)
      .orderBy(sql`case when ${bachelors.chair} ~ '^[0-9]+$' then ${bachelors.chair}::integer else 2147483647 end`);
  }

  first(hallId: number, sessionId: number) {
    return this.selectWindow(hallId, sessionId, 'first');
  }

  next(hallId: number, sessionId: number) {
    return this.selectWindow(hallId, sessionId, 'next');
  }

  previous(hallId: number, sessionId: number) {
    return this.selectWindow(hallId, sessionId, 'previous');
  }

  current(hallId: number, sessionId: number) {
    return this.selectWindow(hallId, sessionId, 'current');
  }

  private async selectWindow(
    hallId: number,
    sessionId: number,
    action: 'first' | 'next' | 'previous' | 'current',
  ) {
    const result = await this.database.transaction(async (transaction) => {
      const rows = await transaction
        .select()
        .from(bachelors)
        .where(
          and(
            eq(bachelors.hallId, hallId),
            eq(bachelors.sessionId, sessionId),
            eq(bachelors.status, true),
          ),
        )
        .orderBy(sql`case when ${bachelors.chair} ~ '^[0-9]+$' then ${bachelors.chair}::integer else 2147483647 end`)
        .for('update');
      if (!rows.length) return null;
      const currentIndex = rows.findIndex(({ bachelorStatus }) => bachelorStatus === 'Current');
      const selectedIndex =
        action === 'first'
          ? 0
          : action === 'current' && currentIndex < 0
            ? 0
            : action === 'next'
              ? currentIndex + 1
              : action === 'previous'
                ? currentIndex - 1
                : currentIndex;
      if (action !== 'first' && action !== 'current' && currentIndex < 0) {
        throw new BadRequestException('Không tìm thấy tân cử nhân đang được hiển thị.');
      }
      if (selectedIndex < 0 || selectedIndex >= rows.length) {
        return { boundary: action === 'next' ? 'last' : 'first' } as const;
      }
      const selected = rows[selectedIndex]!;
      const previous = rows[selectedIndex - 1] ?? null;
      const next = rows[selectedIndex + 1] ?? null;

      await transaction
        .update(bachelors)
        .set({ bachelorStatus: null })
        .where(and(eq(bachelors.hallId, hallId), eq(bachelors.sessionId, sessionId)));
      if (previous) {
        await transaction
          .update(bachelors)
          .set({ bachelorStatus: 'Back' })
          .where(eq(bachelors.id, previous.id));
      }
      await transaction
        .update(bachelors)
        .set({ bachelorStatus: 'Current' })
        .where(eq(bachelors.id, selected.id));
      if (next) {
        await transaction
          .update(bachelors)
          .set({ bachelorStatus: 'Next' })
          .where(eq(bachelors.id, next.id));
      }
      return { previous, selected: { ...selected, bachelorStatus: 'Current' }, next } as const;
    });

    if (result && 'selected' in result) {
      this.realtime.emitAll('SendMessage', `CurrentBachelor ${this.legacyJson(result.selected)}`);
    }
    return result;
  }

  legacyRow(row: typeof bachelors.$inferSelect | null): object | string {
    if (!row) return '';
    return {
      id: row.id,
      studentCode: row.studentCode,
      fullName: row.fullName,
      mail: row.mail,
      faculty: row.faculty,
      major: row.major,
      image: row.image,
      status: row.status,
      statusBaChelor: row.bachelorStatus,
      hallId: row.hallId,
      sessionId: row.sessionId,
      chair: row.chair,
      chairParent: row.chairParent,
      sessionInDay: row.sessionInDay,
      checkIn: row.checkIn,
      timeCheckIn: row.timeCheckIn,
      attendanceStatus: row.attendanceStatus,
    };
  }

  private legacyJson(row: typeof bachelors.$inferSelect): string {
    return JSON.stringify({
      StudentCode: row.studentCode,
      FullName: row.fullName,
      Mail: row.mail,
      Faculty: row.faculty,
      Major: row.major,
      Image: row.image,
      Status: row.status,
      StatusBachelor: row.bachelorStatus,
      HallName: row.hallId,
      SessionNum: row.sessionId,
      Chair: row.chair,
      ChairParent: row.chairParent,
      SessionInDay: row.sessionInDay,
    });
  }
}
