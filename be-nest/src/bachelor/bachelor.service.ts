import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { DATABASE } from '../database/database.constants.js';
import type { AppDatabase } from '../database/database.types.js';
import { bachelors, checkIns, halls, sessions } from '../database/schema/domain-schema.js';
import type { BachelorDto, BachelorListItemDto } from './dto/bachelor.dto.js';

class BachelorImportError extends Error {}

function pageResult<T>(items: T[], totalItems: number, currentPage: number, pageSize: number) {
  const totalPages = Math.ceil(totalItems / pageSize);
  return {
    items,
    totalItems,
    totalPages,
    currentPage,
    pageSize,
    hasPreviousPage: currentPage > 1,
    hasNextPage: currentPage < totalPages,
  };
}

@Injectable()
export class BachelorService {
  constructor(@Inject(DATABASE) private readonly database: AppDatabase) {}

  async list(options: {
    pageIndex: number;
    pageSize: number;
    keySearch?: string;
    hallId?: number;
    sessionId?: number;
    openCheckInOnly?: boolean;
    closedCheckInOnly?: boolean;
  }) {
    const filters: SQL[] = [];
    if (options.keySearch) {
      const search = `%${options.keySearch}%`;
      filters.push(or(ilike(bachelors.fullName, search), ilike(bachelors.studentCode, search))!);
    }
    if (options.hallId !== undefined) filters.push(eq(bachelors.hallId, options.hallId));
    if (options.sessionId !== undefined) filters.push(eq(bachelors.sessionId, options.sessionId));
    if (options.openCheckInOnly || options.closedCheckInOnly) {
      filters.push(eq(checkIns.status, options.openCheckInOnly === true));
      filters.push(sql`${bachelors.checkIn} is not true`);
    }
    const condition = filters.length ? and(...filters) : undefined;
    const base = this.database
      .select({
        id: bachelors.id,
        studentCode: bachelors.studentCode,
        fullName: bachelors.fullName,
        mail: bachelors.mail,
        faculty: bachelors.faculty,
        major: bachelors.major,
        image: bachelors.image,
        status: bachelors.status,
        statusBaChelor: bachelors.bachelorStatus,
        hallName: halls.name,
        sessionNum: sessions.sessionNumber,
        sessionInDay: sql<number | null>`coalesce(${bachelors.sessionInDay}, ${sessions.sessionInDay})`,
        description: sessions.description,
        chair: bachelors.chair,
        chairParent: bachelors.chairParent,
        checkIn: bachelors.checkIn,
        timeCheckIn: bachelors.timeCheckIn,
        attendanceStatus: bachelors.attendanceStatus,
      })
      .from(bachelors)
      .leftJoin(halls, eq(halls.id, bachelors.hallId))
      .leftJoin(sessions, eq(sessions.id, bachelors.sessionId))
      .leftJoin(
        checkIns,
        and(eq(checkIns.hallId, bachelors.hallId), eq(checkIns.sessionId, bachelors.sessionId)),
      )
      .where(condition);
    const countRows = await this.database
      .select({ total: count() })
      .from(bachelors)
      .leftJoin(
        checkIns,
        and(eq(checkIns.hallId, bachelors.hallId), eq(checkIns.sessionId, bachelors.sessionId)),
      )
      .where(condition);
    const total = countRows[0]?.total ?? 0;
    const items = await base
      .orderBy(asc(bachelors.id))
      .limit(options.pageSize)
      .offset((options.pageIndex - 1) * options.pageSize);
    return pageResult(items, total, options.pageIndex, options.pageSize);
  }

  async search(keySearch: string, pageIndex: number, pageSize: number) {
    const page = await this.list({ pageIndex, pageSize, keySearch });
    return {
      ...page,
      items: page.items.map((item) => ({
        image: item.image,
        fullName: item.fullName,
        major: item.major,
        studentCode: item.studentCode,
        mail: item.mail,
        hallName: item.hallName,
        sessionNum: item.sessionNum,
        sessionInDay: item.sessionInDay,
        chair: item.chair,
        chairParent: item.chairParent,
      })),
    };
  }

  async addMany(input: BachelorDto[]) {
    const errors: string[] = [];
    for (const item of input) {
      try {
        await this.database.transaction(async (transaction) => {
          const [duplicate] = await transaction
            .select({ id: bachelors.id })
            .from(bachelors)
            .where(sql`lower(${bachelors.studentCode}) = ${item.studentCode.toLowerCase()}`)
            .limit(1);
          if (duplicate) throw new BachelorImportError(`Tân cử nhân ${item.studentCode} đã tồn tại!`);

          const hall = await this.findOrCreateHall(transaction, item.hallName);
          const session = await this.findOrCreateSession(
            transaction,
            item.sessionNum,
            item.sessionInDay,
          );
          await transaction
            .insert(checkIns)
            .values({ hallId: hall.id, sessionId: session.id })
            .onConflictDoNothing();
          await transaction.insert(bachelors).values({
            image: item.image,
            fullName: item.fullName,
            studentCode: item.studentCode,
            mail: item.mail,
            faculty: item.faculty,
            major: item.major,
            hallId: hall.id,
            sessionId: session.id,
            sessionInDay: item.sessionInDay,
            chair: item.chair,
            chairParent: item.chairParent,
            checkIn: false,
          });
        });
      } catch (error) {
        errors.push(
          error instanceof BachelorImportError
            ? error.message
            : `Không thể thêm tân cử nhân ${item.studentCode}.`,
        );
      }
    }
    return errors;
  }

  async update(item: BachelorDto) {
    const [hall] = await this.database
      .select()
      .from(halls)
      .where(sql`lower(${halls.name}) = ${item.hallName.toLowerCase()}`)
      .limit(1);
    if (!hall) throw new BadRequestException('Hội trường không tồn tại!');
    const [session] = await this.database
      .select()
      .from(sessions)
      .where(eq(sessions.sessionNumber, item.sessionNum))
      .limit(1);
    if (!session) throw new BadRequestException('Phiên không tồn tại!');

    await this.database
      .insert(checkIns)
      .values({ hallId: hall.id, sessionId: session.id })
      .onConflictDoNothing();
    const [updated] = await this.database
      .update(bachelors)
      .set({
        image: item.image,
        fullName: item.fullName,
        mail: item.mail,
        faculty: item.faculty,
        major: item.major,
        hallId: hall.id,
        sessionId: session.id,
        sessionInDay: item.sessionInDay,
        chair: item.chair,
        chairParent: item.chairParent,
      })
      .where(sql`lower(${bachelors.studentCode}) = ${item.studentCode.toLowerCase()}`)
      .returning();
    return updated
      ? {
          id: updated.id,
          fullName: updated.fullName,
          studentCode: updated.studentCode,
          mail: updated.mail,
          major: updated.major,
          hallName: hall.name,
          sessionNum: session.sessionNumber,
          sessionInDay: updated.sessionInDay ?? session.sessionInDay,
        }
      : null;
  }

  async updateMany(input: BachelorListItemDto[], hallId: number, sessionId: number) {
    const errors: string[] = [];
    await this.database.transaction(async (transaction) => {
      for (const item of input) {
        const rows = await transaction
          .update(bachelors)
          .set({
            image: item.image,
            fullName: item.fullName,
            mail: item.mail,
            faculty: item.faculty,
            major: item.major,
            hallId,
            sessionId,
            chair: item.chair,
            chairParent: item.chairParent,
          })
          .where(
            and(
              eq(bachelors.hallId, hallId),
              eq(bachelors.sessionId, sessionId),
              eq(bachelors.studentCode, item.studentCode),
            ),
          )
          .returning({ id: bachelors.id });
        if (!rows.length) errors.push(`Tân cử nhân ${item.studentCode} không tồn tại!`);
      }
    });
    return errors;
  }

  async delete(studentCode: string): Promise<boolean> {
    return (
      await this.database
        .delete(bachelors)
        .where(sql`lower(${bachelors.studentCode}) = ${studentCode.toLowerCase()}`)
        .returning()
    ).length > 0;
  }

  async deleteAll(): Promise<number> {
    return (await this.database.delete(bachelors).returning({ id: bachelors.id })).length;
  }

  async resetStatus(): Promise<void> {
    await this.database
      .update(bachelors)
      .set({ bachelorStatus: null, status: false, checkIn: false, timeCheckIn: null });
  }

  async byHallSession(hallId: number, sessionId: number) {
    return this.database
      .select()
      .from(bachelors)
      .where(and(eq(bachelors.hallId, hallId), eq(bachelors.sessionId, sessionId)))
      .orderBy(asc(bachelors.id));
  }

  async moveToTemporarySession(studentCode: string, isMorning: boolean) {
    return this.database.transaction(async (transaction) => {
      const [bachelor] = await transaction
        .select()
        .from(bachelors)
        .where(sql`lower(${bachelors.studentCode}) = ${studentCode.toLowerCase()}`)
        .limit(1)
        .for('update');
      if (!bachelor) throw new BadRequestException('Tân cử nhân chưa được import vào hệ thống!');
      if (bachelor.hallId === null) throw new BadRequestException('Tân cử nhân chưa được xếp hội trường.');
      const hallId = bachelor.hallId;
      const [session] = await transaction
        .select()
        .from(sessions)
        .where(eq(sessions.sessionNumber, isMorning ? 100 : 111))
        .limit(1);
      if (!session) throw new BadRequestException('Chưa cấu hình phiên tạm.');
      await transaction
        .insert(checkIns)
        .values({ hallId, sessionId: session.id, status: false })
        .onConflictDoNothing();
      const chairs = await transaction
        .select({ chair: bachelors.chair })
        .from(bachelors)
        .where(and(eq(bachelors.hallId, hallId), eq(bachelors.sessionId, session.id)));
      const chair = this.firstAvailableChair(chairs.map(({ chair }) => chair));
      const [updated] = await transaction
        .update(bachelors)
        .set({ sessionId: session.id, sessionInDay: session.sessionInDay, chair, chairParent: `PH${chair}` })
        .where(eq(bachelors.id, bachelor.id))
        .returning();
      const [hall] = await transaction.select().from(halls).where(eq(halls.id, hallId));
      return { bachelor: updated!, session, hall: hall! };
    });
  }

  async transferLateStudent(studentCode: string, newSessionId: number) {
    return this.database.transaction(async (transaction) => {
      const [bachelor] = await transaction
        .select()
        .from(bachelors)
        .where(sql`lower(${bachelors.studentCode}) = ${studentCode.toLowerCase()}`)
        .limit(1)
        .for('update');
      if (!bachelor) throw new BadRequestException('Không tìm thấy tân cử nhân trong hệ thống!');
      if (bachelor.hallId === null) throw new BadRequestException('Tân cử nhân chưa được xếp hội trường.');
      const hallId = bachelor.hallId;
      if (bachelor.checkIn) {
        throw new BadRequestException('Tân cử nhân đã check-in nên không thể chuyển phiên!');
      }
      const [session] = await transaction
        .select()
        .from(sessions)
        .where(eq(sessions.id, newSessionId))
        .limit(1);
      if (!session) throw new BadRequestException('Không tìm thấy phiên đích!');
      await transaction
        .insert(checkIns)
        .values({ hallId, sessionId: session.id, status: false })
        .onConflictDoNothing();
      const chairs = await transaction
        .select({ chair: bachelors.chair })
        .from(bachelors)
        .where(and(eq(bachelors.hallId, hallId), eq(bachelors.sessionId, session.id)));
      const chair = this.firstAvailableChair(chairs.map(({ chair }) => chair));
      const [updated] = await transaction
        .update(bachelors)
        .set({
          sessionId: session.id,
          sessionInDay: session.sessionInDay,
          attendanceStatus: 2,
          chair,
          chairParent: `PH${chair}`,
        })
        .where(eq(bachelors.id, bachelor.id))
        .returning();
      return { bachelor: updated!, session };
    });
  }

  private firstAvailableChair(values: (string | null)[]): string {
    const occupied = new Set(values);
    let candidate = 1;
    while (occupied.has(String(candidate))) candidate += 1;
    return String(candidate);
  }

  private async findOrCreateHall(transaction: Parameters<Parameters<AppDatabase['transaction']>[0]>[0], name: string) {
    const [found] = await transaction
      .select()
      .from(halls)
      .where(sql`lower(${halls.name}) = ${name.toLowerCase()}`)
      .limit(1);
    if (found) return found;
    const [created] = await transaction.insert(halls).values({ name }).returning();
    return created!;
  }

  private async findOrCreateSession(
    transaction: Parameters<Parameters<AppDatabase['transaction']>[0]>[0],
    sessionNumber: number,
    sessionInDay?: number | null,
  ) {
    const [found] = await transaction
      .select()
      .from(sessions)
      .where(eq(sessions.sessionNumber, sessionNumber))
      .limit(1);
    if (found) {
      if (found.sessionInDay === null && sessionInDay != null) {
        const [updated] = await transaction
          .update(sessions)
          .set({ sessionInDay })
          .where(eq(sessions.id, found.id))
          .returning();
        return updated!;
      }
      return found;
    }
    const [created] = await transaction
      .insert(sessions)
      .values({ sessionNumber, sessionInDay })
      .returning();
    return created!;
  }
}
