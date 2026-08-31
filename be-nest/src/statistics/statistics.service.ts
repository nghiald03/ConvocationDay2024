import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import { DATABASE } from '../database/database.constants.js';
import type { AppDatabase } from '../database/database.types.js';
import { bachelors, checkIns, halls, sessions } from '../database/schema/domain-schema.js';

@Injectable()
export class StatisticsService {
  constructor(@Inject(DATABASE) private readonly database: AppDatabase) {}

  async activeHallSummary() {
    return this.database
      .select({
        sessionId: sessions.id,
        sessionNumber: sessions.sessionNumber,
        hallId: halls.id,
        hallName: halls.name,
        sessionInDay: sql<number>`coalesce(${sessions.sessionInDay}, 0)`,
        totalStudents: count(bachelors.id),
        checkedInCount: sql<number>`count(${bachelors.id}) filter (where ${bachelors.checkIn} = true)::int`,
      })
      .from(checkIns)
      .innerJoin(halls, eq(halls.id, checkIns.hallId))
      .innerJoin(sessions, eq(sessions.id, checkIns.sessionId))
      .leftJoin(
        bachelors,
        and(eq(bachelors.hallId, halls.id), eq(bachelors.sessionId, sessions.id)),
      )
      .where(eq(checkIns.status, true))
      .groupBy(sessions.id, halls.id)
      .orderBy(asc(halls.name), asc(sessions.sessionNumber));
  }

  async hallOverview() {
    const rows = await this.database
      .select({
        hallId: halls.id,
        hallName: halls.name,
        sessionId: sessions.id,
        sessionNumber: sessions.sessionNumber,
        checkedIn: bachelors.checkIn,
      })
      .from(bachelors)
      .innerJoin(halls, eq(halls.id, bachelors.hallId))
      .innerJoin(sessions, eq(sessions.id, bachelors.sessionId))
      .orderBy(asc(halls.name), asc(sessions.sessionNumber));

    const grouped = new Map<number, (typeof rows)[number][]>();
    for (const row of rows) grouped.set(row.hallId, [...(grouped.get(row.hallId) ?? []), row]);

    return [...grouped.values()].map((hallRows) => {
      const first = hallRows[0]!;
      const bySession = new Map<number, (typeof rows)[number][]>();
      for (const row of hallRows) {
        bySession.set(row.sessionId, [...(bySession.get(row.sessionId) ?? []), row]);
      }
      const sessionRows = [...bySession.values()].map((values) => ({
        sessionId: values[0]!.sessionId,
        sessionNumber: values[0]!.sessionNumber,
        totalStudents: values.length,
        checkedInCount: values.filter(({ checkedIn }) => checkedIn === true).length,
      }));
      const current = sessionRows.at(-1);
      return {
        hallId: first.hallId,
        hallName: first.hallName,
        totalSessions: sessionRows.length,
        sessions: sessionRows,
        currentSessionId: current?.sessionId ?? null,
        currentSessionNumber: current?.sessionNumber ?? null,
      };
    });
  }
}
