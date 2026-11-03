import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, ilike, ne, sql } from 'drizzle-orm';
import { BachelorService } from '../bachelor/bachelor.service.js';
import { assertCheckInRoomAllowed, type CheckInRoomScope } from '../bachelor/checkin-room-scope.js';
import { DATABASE } from '../database/database.constants.js';
import type { AppDatabase } from '../database/database.types.js';
import { bachelors, checkIns, halls, sessions } from '../database/schema/domain-schema.js';

/** Thứ tự gọi trên LED đi theo số ghế, nên ghế lớn nhất + 1 là vị trí cuối phiên. */
export function nextChairAtEnd(chairs: (string | null)[]): string {
  const numbers = chairs
    .filter((chair): chair is string => chair !== null && /^[0-9]+$/.test(chair))
    .map(Number);
  return String(Math.max(0, ...numbers) + 1);
}

@Injectable()
export class CheckInService {
  constructor(
    @Inject(DATABASE) private readonly database: AppDatabase,
    private readonly bachelorService: BachelorService,
  ) {}

  async checkInBachelor(
    studentCode: string,
    status: boolean,
    scope: CheckInRoomScope,
    cancellationConfirmation?: string,
  ) {
    return this.database.transaction(async (transaction) => {
      const [bachelor] = await transaction
        .select()
        .from(bachelors)
        .where(sql`lower(${bachelors.studentCode}) = ${studentCode.toLowerCase()}`)
        .limit(1)
        .for('update');
      if (!bachelor) throw new BadRequestException('Không tìm thấy tân cử nhân trong hệ thống.');
      assertCheckInRoomAllowed(scope, bachelor.checkinRoom);
      if (bachelor.hallId === null || bachelor.sessionId === null) {
        throw new BadRequestException('Tân cử nhân chưa được xếp hội trường hoặc phiên.');
      }
      const hallId = bachelor.hallId;
      const sessionId = bachelor.sessionId;
      if (bachelor.bachelorStatus === 'Current') {
        throw new BadRequestException(
          'Tân cử nhân đang được chiếu trên màn hình nên chưa thể cập nhật trạng thái check-in.',
        );
      }
      if (!status) {
        const normalizedConfirmation = cancellationConfirmation?.trim().toLowerCase();
        if (!bachelor.checkIn) {
          throw new BadRequestException('Tân cử nhân này chưa check-in nên không thể hủy check-in.');
        }
        if (normalizedConfirmation !== bachelor.studentCode.toLowerCase()) {
          throw new BadRequestException('Vui lòng nhập đúng MSSV để xác nhận hủy check-in.');
        }
      }
      const [checkIn] = await transaction
        .select()
        .from(checkIns)
        .where(
          and(eq(checkIns.hallId, hallId), eq(checkIns.sessionId, sessionId)),
        )
        .limit(1)
        .for('update');
      if (!checkIn || checkIn.status === null) {
        throw new BadRequestException('Phiên này chưa được mở, vui lòng đến đúng phiên của bạn.');
      }
      if (!checkIn.status) {
        if (!status) {
          throw new BadRequestException(
            'Phiên đã khóa nên không thể hủy check-in. Vui lòng mở lại phiên trước.',
          );
        }
        // Quét lại người đã check-in không được đẩy ghế của họ xuống thêm lần nữa.
        if (bachelor.checkIn) return { bachelor, late: false };
        // Dòng check-in đang bị khóa FOR UPDATE nên các lượt đến muộn cùng phiên không nhận trùng ghế.
        const others = await transaction
          .select({ chair: bachelors.chair })
          .from(bachelors)
          .where(
            and(
              eq(bachelors.hallId, hallId),
              eq(bachelors.sessionId, sessionId),
              ne(bachelors.id, bachelor.id),
            ),
          );
        const chair = nextChairAtEnd(others.map((other) => other.chair));
        const [updated] = await transaction
          .update(bachelors)
          .set({
            chair,
            chairParent: `PH${chair}`,
            timeCheckIn: new Date(),
            checkIn: true,
            status: true,
            attendanceStatus: 2,
          })
          .where(eq(bachelors.id, bachelor.id))
          .returning();
        return { bachelor: updated!, late: true };
      }
      const [updated] = await transaction
        .update(bachelors)
        .set({
          timeCheckIn: new Date(),
          checkIn: status,
          status,
          ...(status ? { attendanceStatus: 1 } : {}),
        })
        .where(eq(bachelors.id, bachelor.id))
        .returning();
      return { bachelor: updated!, late: false };
    });
  }

  async listRaw() {
    return this.database
      .select({
        checkinId: checkIns.id,
        hallId: checkIns.hallId,
        sessionId: checkIns.sessionId,
        status: checkIns.status,
      })
      .from(checkIns)
      .orderBy(asc(checkIns.id));
  }

  async uncheckAll(): Promise<void> {
    await this.database
      .update(bachelors)
      .set({ timeCheckIn: null, checkIn: false, status: false, attendanceStatus: 0 });
  }

  async listStatuses(status?: boolean) {
    return this.database
      .select({
        checkinId: checkIns.id,
        hallName: halls.name,
        sessionNum: sessions.sessionNumber,
        status: checkIns.status,
        sessionInDay: sessions.sessionInDay,
      })
      .from(checkIns)
      .innerJoin(halls, eq(halls.id, checkIns.hallId))
      .innerJoin(sessions, eq(sessions.id, checkIns.sessionId))
      .where(status === undefined ? undefined : eq(checkIns.status, status))
      .orderBy(asc(checkIns.id));
  }

  async updateStatus(checkinId: number, status: boolean) {
    return this.database.transaction(async (transaction) => {
      const [checkIn] = await transaction
        .select()
        .from(checkIns)
        .where(eq(checkIns.id, checkinId))
        .limit(1)
        .for('update');
      if (!checkIn) throw new BadRequestException('Bản ghi check-in không tồn tại!');
      if (!status && checkIn.hallId !== null && checkIn.sessionId !== null) {
        const hallId = checkIn.hallId;
        const sessionId = checkIn.sessionId;
        await transaction
          .update(bachelors)
          .set({ attendanceStatus: 3 })
          .where(
            and(
              eq(bachelors.hallId, hallId),
              eq(bachelors.sessionId, sessionId),
              sql`${bachelors.checkIn} is not true`,
              eq(bachelors.attendanceStatus, 0),
            ),
          );
      }
      const [updated] = await transaction
        .update(checkIns)
        .set({ status })
        .where(eq(checkIns.id, checkinId))
        .returning();
      return {
        checkinId: updated!.id,
        hallId: updated!.hallId,
        sessionId: updated!.sessionId,
        status: updated!.status,
      };
    });
  }

  async counts() {
    return this.database
      .select({
        hallName: halls.name,
        sessionNum: sessions.sessionNumber,
        bachelorsCheckined: sql<number>`count(${bachelors.id}) filter (where ${bachelors.checkIn} = true and ${bachelors.status} = true)::int`,
        bachelorsSession: count(bachelors.id),
        status: sql<string>`case when ${checkIns.status} is null then 'Init' when ${checkIns.status} = true then 'Opening' else 'Closed' end`,
      })
      .from(checkIns)
      .innerJoin(halls, eq(halls.id, checkIns.hallId))
      .innerJoin(sessions, eq(sessions.id, checkIns.sessionId))
      .leftJoin(
        bachelors,
        and(eq(bachelors.hallId, checkIns.hallId), eq(bachelors.sessionId, checkIns.sessionId)),
      )
      .groupBy(checkIns.id, halls.id, sessions.id)
      .orderBy(asc(halls.name), asc(sessions.sessionNumber));
  }

  async create(hallId: number, sessionId: number): Promise<boolean> {
    return (
      await this.database
        .insert(checkIns)
        .values({ hallId, sessionId, status: null })
        .onConflictDoNothing()
        .returning()
    ).length > 0;
  }

  async bachelorsNotCheckedIn(pageIndex?: number, pageSize?: number) {
    if (pageIndex !== undefined && pageSize !== undefined) {
      return this.bachelorService.list({ pageIndex, pageSize, closedCheckInOnly: true });
    }
    const page = await this.bachelorService.list({
      pageIndex: 1,
      pageSize: 100_000,
      closedCheckInOnly: true,
    });
    return page.items;
  }

  async studentsNotCheckedInOpenSessions(options: {
    hallId?: number;
    sessionId?: number;
    keySearch?: string;
    pageIndex: number;
    pageSize: number;
  }) {
    return this.bachelorService.list({ ...options, openCheckInOnly: true });
  }

  async byHallId(hallId: number) {
    return this.byHallCondition(eq(halls.id, hallId));
  }

  async byHallName(hallName: string) {
    return this.byHallCondition(ilike(halls.name, hallName));
  }

  private byHallCondition(condition: ReturnType<typeof eq>) {
    return this.database
      .select({
        checkinId: checkIns.id,
        status: checkIns.status,
        hallId: halls.id,
        hallName: halls.name,
        sessionId: sessions.id,
        sessionNumber: sessions.sessionNumber,
        sessionInDay: sessions.sessionInDay,
        sessionDescription: sessions.description,
      })
      .from(checkIns)
      .innerJoin(halls, eq(halls.id, checkIns.hallId))
      .innerJoin(sessions, eq(sessions.id, checkIns.sessionId))
      .where(condition)
      .orderBy(asc(sessions.sessionNumber));
  }
}
