import { BadRequestException, ForbiddenException, Inject, Injectable, Optional } from '@nestjs/common';
import { and, asc, count, eq, ilike, inArray, isNotNull, ne, or, sql, type SQL } from 'drizzle-orm';
import { DATABASE } from '../database/database.constants.js';
import type { AppDatabase } from '../database/database.types.js';
import { Permission } from '../auth/permissions.js';
import type { ActorContext } from '../common/guards/actor-context.js';
import { userCheckinRooms } from '../database/schema/authorization-schema.js';
import { bachelors, checkIns, halls, sessions } from '../database/schema/domain-schema.js';
import { assertCheckInRoomAllowed, type CheckInRoomScope } from './checkin-room-scope.js';
import type { BachelorDto, BachelorListItemDto, TransferReason } from './dto/bachelor.dto.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import { nextChairAfterSession, nextChairAtEnd } from './next-chair-at-end.js';

/** Số tân cử nhân ghi trong một câu lệnh INSERT; đủ lớn để ít vòng mạng, đủ nhỏ để không chạm giới hạn tham số. */
export const IMPORT_BATCH_SIZE = 200;
const EXISTING_CODE_LOOKUP_SIZE = 1000;

export type ImportProgress = {
  total: number;
  /** Số dòng đã xử lý xong, dù thành công hay lỗi. */
  processed: number;
  added: number;
  failed: number;
};

function placementKey(item: Pick<BachelorDto, 'hallName' | 'sessionNum'>) {
  return `${item.hallName.toLowerCase()}|${item.sessionNum}`;
}

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
  constructor(
    @Inject(DATABASE) private readonly database: AppDatabase,
    @Optional() private readonly realtime?: RealtimeService,
  ) {}

  /** Báo cho các màn đang mở tải lại danh sách tân cử nhân (gọi sau khi đã ghi xong). */
  private changed(hallId?: number | null, sessionId?: number | null) {
    this.realtime?.dataChanged('bachelor', { hallId, sessionId });
  }

  async list(options: {
    pageIndex: number;
    pageSize: number;
    keySearch?: string;
    hallId?: number;
    sessionId?: number;
    checkinRoom?: string;
    openCheckInOnly?: boolean;
    closedCheckInOnly?: boolean;
    checkedIn?: boolean;
  }) {
    const filters: SQL[] = [];
    if (options.keySearch) {
      const search = `%${options.keySearch}%`;
      filters.push(or(ilike(bachelors.fullName, search), ilike(bachelors.studentCode, search))!);
    }
    if (options.hallId !== undefined) filters.push(eq(bachelors.hallId, options.hallId));
    if (options.sessionId !== undefined) filters.push(eq(bachelors.sessionId, options.sessionId));
    if (options.checkinRoom) {
      filters.push(sql`lower(${bachelors.checkinRoom}) = ${options.checkinRoom.trim().toLowerCase()}`);
    }
    if (options.checkedIn === true) filters.push(eq(bachelors.checkIn, true));
    if (options.checkedIn === false) filters.push(sql`${bachelors.checkIn} is not true`);
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
        /** Ghế cũ của người bị xếp xuống cuối phiên (họ vẫn ngồi ở đó); null nếu chưa bị đẩy. */
        originalChair: bachelors.originalChair,
        chairParent: bachelors.chairParent,
        checkinRoom: bachelors.checkinRoom,
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
        checkinRoom: item.checkinRoom,
      })),
    };
  }

  /**
   * Thêm danh sách tân cử nhân và trả về các lỗi theo từng dòng (rỗng nếu thành công hết).
   * Làm theo lô: tra trùng một lần, tìm hoặc tạo side và phiên một lần cho mỗi cặp, rồi INSERT mỗi lô một câu lệnh.
   * Lô nào lỗi thì thử lại từng dòng để biết chính xác dòng nào hỏng. `onProgress` được gọi sau mỗi bước.
   */
  async addMany(input: BachelorDto[], onProgress?: (progress: ImportProgress) => void): Promise<string[]> {
    const errors: string[] = [];
    let processed = 0;
    let added = 0;
    const report = () => onProgress?.({ total: input.length, processed, added, failed: errors.length });
    const fail = (item: BachelorDto, message = `Không thể thêm tân cử nhân ${item.studentCode}.`) => {
      errors.push(message);
      processed += 1;
    };
    report();

    const existing = await this.existingStudentCodes(input.map((item) => item.studentCode));
    const seen = new Set<string>();
    const candidates: BachelorDto[] = [];
    for (const item of input) {
      const key = item.studentCode.toLowerCase();
      if (existing.has(key) || seen.has(key)) {
        fail(item, `Tân cử nhân ${item.studentCode} đã tồn tại!`);
        continue;
      }
      seen.add(key);
      candidates.push(item);
    }
    report();

    const placements = await this.resolveImportPlacements(candidates);
    const ready: { item: BachelorDto; row: typeof bachelors.$inferInsert }[] = [];
    for (const item of candidates) {
      const placement = placements.get(placementKey(item));
      if (!placement) {
        fail(item);
        continue;
      }
      ready.push({
        item,
        row: {
          image: item.image,
          fullName: item.fullName,
          studentCode: item.studentCode,
          mail: item.mail,
          faculty: item.faculty,
          major: item.major,
          hallId: placement.hallId,
          sessionId: placement.sessionId,
          sessionInDay: item.sessionInDay,
          chair: item.chair,
          chairParent: item.chairParent,
          checkinRoom: item.checkinRoom,
          checkIn: false,
        },
      });
    }
    report();

    for (let index = 0; index < ready.length; index += IMPORT_BATCH_SIZE) {
      const chunk = ready.slice(index, index + IMPORT_BATCH_SIZE);
      try {
        await this.database.transaction(async (transaction) => {
          await transaction.insert(bachelors).values(chunk.map(({ row }) => row));
        });
        added += chunk.length;
        processed += chunk.length;
      } catch {
        for (const { item, row } of chunk) {
          try {
            await this.database.transaction(async (transaction) => {
              await transaction.insert(bachelors).values(row);
            });
            added += 1;
            processed += 1;
          } catch {
            fail(item);
          }
        }
      }
      report();
    }
    if (added > 0) this.changed();
    return errors;
  }

  /** Mã tân cử nhân (chữ thường) đã có trong DB trong số các mã đưa vào. */
  private async existingStudentCodes(codes: string[]): Promise<Set<string>> {
    const unique = [...new Set(codes.map((code) => code.toLowerCase()))];
    const found = new Set<string>();
    for (let index = 0; index < unique.length; index += EXISTING_CODE_LOOKUP_SIZE) {
      const rows = await this.database
        .select({ code: sql<string>`lower(${bachelors.studentCode})` })
        .from(bachelors)
        .where(inArray(sql`lower(${bachelors.studentCode})`, unique.slice(index, index + EXISTING_CODE_LOOKUP_SIZE)));
      for (const { code } of rows) found.add(code);
    }
    return found;
  }

  /** Tìm hoặc tạo side, phiên và dòng check-in cho mỗi cặp (side, phiên) khác nhau, mỗi cặp một lần duy nhất. */
  private async resolveImportPlacements(items: BachelorDto[]) {
    const placements = new Map<string, { hallId: number; sessionId: number }>();
    const failed = new Set<string>();
    const halls = new Map<string, number>();
    const sessionIds = new Map<number, number>();
    for (const item of items) {
      const key = placementKey(item);
      if (placements.has(key) || failed.has(key)) continue;
      const hallKey = item.hallName.toLowerCase();
      try {
        const resolved = await this.database.transaction(async (transaction) => {
          const hallId = halls.get(hallKey) ?? (await this.findOrCreateHall(transaction, item.hallName)).id;
          const sessionId =
            sessionIds.get(item.sessionNum) ??
            (await this.findOrCreateSession(transaction, item.sessionNum, item.sessionInDay)).id;
          await transaction.insert(checkIns).values({ hallId, sessionId }).onConflictDoNothing();
          return { hallId, sessionId };
        });
        // Chỉ nhớ sau khi transaction đã thành công, tránh nhớ side hay phiên vừa bị rollback.
        halls.set(hallKey, resolved.hallId);
        sessionIds.set(item.sessionNum, resolved.sessionId);
        placements.set(key, resolved);
      } catch {
        failed.add(key);
      }
    }
    return placements;
  }

  async update(item: BachelorDto) {
    const [hall] = await this.database
      .select()
      .from(halls)
      .where(sql`lower(${halls.name}) = ${item.hallName.toLowerCase()}`)
      .limit(1);
    if (!hall) throw new BadRequestException('Side không tồn tại!');
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
        // The form does not send sessionInDay; follow the chosen session so an old value is not kept.
        sessionInDay: item.sessionInDay ?? session.sessionInDay,
        chair: item.chair,
        chairParent: item.chairParent,
        checkinRoom: item.checkinRoom,
      })
      .where(sql`lower(${bachelors.studentCode}) = ${item.studentCode.toLowerCase()}`)
      .returning();
    if (updated) this.changed(hall.id, session.id);
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
            checkinRoom: item.checkinRoom,
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
    this.changed(hallId, sessionId);
    return errors;
  }

  async delete(studentCode: string): Promise<boolean> {
    const deleted =
      (
        await this.database
          .delete(bachelors)
          .where(sql`lower(${bachelors.studentCode}) = ${studentCode.toLowerCase()}`)
          .returning()
      ).length > 0;
    if (deleted) this.changed();
    return deleted;
  }

  async deleteAll(): Promise<number> {
    const deleted = (await this.database.delete(bachelors).returning({ id: bachelors.id })).length;
    this.changed();
    return deleted;
  }

  async resetStatus(): Promise<void> {
    await this.database
      .update(bachelors)
      .set({
        bachelorStatus: null,
        status: false,
        checkIn: false,
        timeCheckIn: null,
        attendanceStatus: 0,
        // Người từng bị đẩy xuống hàng Z trở về ghế gốc.
        chair: sql`coalesce(${bachelors.originalChair}, ${bachelors.chair})`,
        originalChair: null,
      });
    // Reset toàn bộ điểm danh: ảnh hưởng mọi side và phiên, và xóa cả trạng thái LED.
    this.realtime?.dataChanged('checkin');
    this.realtime?.dataChanged('led');
  }

  async byHallSession(hallId: number, sessionId: number) {
    return this.database
      .select()
      .from(bachelors)
      .where(and(eq(bachelors.hallId, hallId), eq(bachelors.sessionId, sessionId)))
      .orderBy(asc(bachelors.id));
  }

  /** Đọc mới mỗi lần để việc đổi phân phòng có hiệu lực ngay, không cần đăng nhập lại. */
  async checkInRoomScope(actor: ActorContext): Promise<CheckInRoomScope> {
    if (
      actor.permissions.includes(Permission.ManageBachelors) ||
      actor.permissions.includes(Permission.CheckInAllRooms)
    ) {
      return { unrestricted: true };
    }
    const rows = await this.database
      .select({ room: userCheckinRooms.room })
      .from(userCheckinRooms)
      .where(eq(userCheckinRooms.userId, actor.userId))
      .orderBy(asc(userCheckinRooms.room));
    return { unrestricted: false, rooms: rows.map(({ room }) => room) };
  }

  /** Danh sách phòng đang có; gộp các dòng chỉ khác chữ hoa/thường. */
  async listCheckInRooms(): Promise<string[]> {
    const rows = await this.database
      .select({ room: sql<string>`min(${bachelors.checkinRoom})` })
      .from(bachelors)
      .where(isNotNull(bachelors.checkinRoom))
      .groupBy(sql`lower(${bachelors.checkinRoom})`)
      .orderBy(sql`min(${bachelors.checkinRoom})`);
    return rows.map(({ room }) => room);
  }

  async moveToTemporarySession(studentCode: string, isMorning: boolean, scope: CheckInRoomScope) {
    const result = await this.database.transaction(async (transaction) => {
      const [bachelor] = await transaction
        .select()
        .from(bachelors)
        .where(sql`lower(${bachelors.studentCode}) = ${studentCode.toLowerCase()}`)
        .limit(1)
        .for('update');
      if (!bachelor) throw new BadRequestException('Tân cử nhân chưa được import vào hệ thống!');
      assertCheckInRoomAllowed(scope, bachelor.checkinRoom);
      if (bachelor.hallId === null) throw new BadRequestException('Tân cử nhân chưa được xếp side.');
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
      const chair = await this.chairAtEndOfSession(transaction, hallId, session.id, bachelor.id);
      const [updated] = await transaction
        .update(bachelors)
        .set({ sessionId: session.id, sessionInDay: session.sessionInDay, chair })
        .where(eq(bachelors.id, bachelor.id))
        .returning();
      const [hall] = await transaction.select().from(halls).where(eq(halls.id, hallId));
      return { bachelor: updated!, session, hall: hall! };
    });
    this.changed(result.hall.id, result.session.id);
    return result;
  }

  /**
   * Chuyển ca cho tân cử nhân chưa check-in.
   * late: đến trễ, ghi nhận trễ (attendanceStatus 2). organizer: BTC dời, giữ nguyên trạng thái điểm danh;
   * chỉ tài khoản không bị giới hạn phòng (MN, CL) được dùng.
   * Side đích mặc định là side cũ. Ghế luôn tự động: ngay sau ghế cuối của phiên đích trong side đó
   * (xem nextChairAfterSession), không ghi đè ghế của người đã có trong phiên mới.
   */
  async transferStudent(
    studentCode: string,
    newSessionId: number,
    reason: TransferReason,
    scope: CheckInRoomScope,
    newHallId?: number,
  ) {
    if (reason === 'organizer' && !scope.unrestricted) {
      throw new ForbiddenException('Chỉ Manager hoặc Check-in Lead được chuyển ca theo yêu cầu BTC.');
    }
    const result = await this.database.transaction(async (transaction) => {
      const [bachelor] = await transaction
        .select()
        .from(bachelors)
        .where(sql`lower(${bachelors.studentCode}) = ${studentCode.toLowerCase()}`)
        .limit(1)
        .for('update');
      if (!bachelor) throw new BadRequestException('Không tìm thấy tân cử nhân trong hệ thống!');
      assertCheckInRoomAllowed(scope, bachelor.checkinRoom);
      if (bachelor.hallId === null) throw new BadRequestException('Tân cử nhân chưa được xếp side.');
      if (bachelor.checkIn) {
        throw new BadRequestException('Tân cử nhân đã check-in nên không thể chuyển phiên!');
      }
      const [session] = await transaction
        .select()
        .from(sessions)
        .where(eq(sessions.id, newSessionId))
        .limit(1);
      if (!session) throw new BadRequestException('Không tìm thấy phiên đích!');
      const [hall] = await transaction
        .select()
        .from(halls)
        .where(eq(halls.id, newHallId ?? bachelor.hallId))
        .limit(1);
      if (!hall) throw new BadRequestException('Không tìm thấy side đích!');
      const hallId = hall.id;
      // Phiên đích chưa có dòng check-in thì nó chưa mở lần nào: tạo ở trạng thái chưa mở (null), không phải đã khóa,
      // để người check-in sau đó không bị tính trễ.
      await transaction
        .insert(checkIns)
        .values({ hallId, sessionId: session.id })
        .onConflictDoNothing();
      const chair = await this.chairForTransfer(transaction, hallId, session.id, bachelor.id);
      const [updated] = await transaction
        .update(bachelors)
        .set({
          hallId,
          sessionId: session.id,
          sessionInDay: session.sessionInDay,
          ...(reason === 'late' ? { attendanceStatus: 2 } : {}),
          chair,
        })
        .where(eq(bachelors.id, bachelor.id))
        .returning();
      return { bachelor: updated!, session, hall };
    });
    this.changed(result.bachelor.hallId, result.session.id);
    return result;
  }

  private async chairForTransfer(
    transaction: Parameters<Parameters<AppDatabase['transaction']>[0]>[0],
    hallId: number,
    sessionId: number,
    bachelorId: number,
  ): Promise<string> {
    const { others } = await this.lockHallSeats(transaction, hallId, sessionId, bachelorId);
    const sessionChairs = others.filter((other) => other.sessionId === sessionId).map(({ chair }) => chair);
    const [ledCurrent] = await transaction
      .select({ chair: bachelors.chair })
      .from(bachelors)
      .where(
        and(
          eq(bachelors.hallId, hallId),
          eq(bachelors.sessionId, sessionId),
          eq(bachelors.status, true),
          eq(bachelors.bachelorStatus, 'Current'),
        ),
      )
      .limit(1);
    return nextChairAfterSession(
      sessionChairs,
      others.map(({ chair }) => chair),
      ledCurrent?.chair ?? null,
    );
  }

  private async chairAtEndOfSession(
    transaction: Parameters<Parameters<AppDatabase['transaction']>[0]>[0],
    hallId: number,
    sessionId: number,
    bachelorId: number,
  ): Promise<string> {
    const { others } = await this.lockHallSeats(transaction, hallId, sessionId, bachelorId);
    return nextChairAtEnd(
      others.filter((other) => other.sessionId === sessionId).map(({ chair }) => chair),
      others.map(({ chair }) => chair),
    );
  }

  private async lockHallSeats(
    transaction: Parameters<Parameters<AppDatabase['transaction']>[0]>[0],
    hallId: number,
    sessionId: number,
    bachelorId: number,
  ) {
    // Khóa cùng dòng check-in với luồng đến trễ để các lượt xếp cuối phiên không nhận trùng ghế.
    await transaction
      .select({ id: checkIns.id })
      .from(checkIns)
      .where(and(eq(checkIns.hallId, hallId), eq(checkIns.sessionId, sessionId)))
      .limit(1)
      .for('update');
    const others = await transaction
      .select({ chair: bachelors.chair, sessionId: bachelors.sessionId })
      .from(bachelors)
      .where(and(eq(bachelors.hallId, hallId), ne(bachelors.id, bachelorId)));
    return { others };
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
