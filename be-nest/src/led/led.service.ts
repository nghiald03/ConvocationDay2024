import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DATABASE } from '../database/database.constants.js';
import type { AppDatabase } from '../database/database.types.js';
import { bachelors } from '../database/schema/domain-schema.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import { chairOrder } from './chair-order.js';
import { isGridChair } from '../checkin/late-seat-rule.js';
import { loadLedQueue } from './led-queue.js';

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
      .orderBy(...chairOrder);
  }

  /**
   * Hàng đợi LED của một (side, phiên) theo đúng thứ tự MC sẽ chiếu. Chỉ đọc, dùng cùng truy vấn với nút Next.
   * Người ở hàng Z (đến trễ, bị đẩy cuối) có `isTail = true`.
   */
  async queue(hallId: number, sessionId: number) {
    const rows = await loadLedQueue(this.database, hallId, sessionId);
    const currentIndex = rows.findIndex(({ bachelorStatus }) => bachelorStatus === 'Current');
    const items = rows.map((row, index) => ({
      position: index + 1,
      id: row.id,
      studentCode: row.studentCode,
      fullName: row.fullName,
      chair: row.chair,
      originalChair: row.originalChair,
      bachelorStatus: row.bachelorStatus,
      attendanceStatus: row.attendanceStatus,
      timeCheckIn: row.timeCheckIn,
      isTail: !isGridChair(row.chair),
      progress:
        currentIndex < 0 || index > currentIndex
          ? ('upcoming' as const)
          : index === currentIndex
            ? ('current' as const)
            : ('done' as const),
    }));
    const lastRegular = items.filter((item) => !item.isTail).at(-1) ?? null;
    return {
      total: items.length,
      currentIndex: currentIndex < 0 ? null : currentIndex,
      lastRegularChair: lastRegular?.chair ?? null,
      items,
    };
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

  /**
   * Manager bắt đầu chiếu: đặt `Current` vào người đầu hàng đợi lúc này.
   * LED đã bắt đầu thì từ chối, trừ khi `restart` (quay về người đầu), để bấm nhầm không làm LED nhảy ngược giữa buổi lễ.
   */
  start(hallId: number, sessionId: number, restart = false) {
    return this.selectWindow(hallId, sessionId, 'first', { refuseIfStarted: !restart });
  }

  /**
   * MC nhảy tới một người trong hàng đợi (về đầu hoặc theo MSSV) khi LED đã bắt đầu.
   * Không dùng để bắt đầu: LED chưa có người đang chiếu thì từ chối, việc đó dành cho Manager (`start`).
   */
  jump(hallId: number, sessionId: number, target: 'first' | { studentCode: string }) {
    return this.selectWindow(hallId, sessionId, target === 'first' ? 'jump-first' : target);
  }

  /**
   * Người đang chiếu cùng người trước và sau, chỉ đọc. Không tự chọn ai: chưa bắt đầu thì trả về `notStarted`,
   * để mở trang LED hay MC sớm không làm LED "chạy" khi Manager chưa bấm Bắt đầu.
   */
  async current(hallId: number, sessionId: number) {
    const rows = await loadLedQueue(this.database, hallId, sessionId);
    const index = rows.findIndex(({ bachelorStatus }) => bachelorStatus === 'Current');
    if (index < 0) return { notStarted: true } as const;
    return {
      previous: rows[index - 1] ?? null,
      selected: rows[index]!,
      next: rows[index + 1] ?? null,
    } as const;
  }

  private async selectWindow(
    hallId: number,
    sessionId: number,
    action: 'first' | 'next' | 'previous' | 'jump-first' | { studentCode: string },
    options: { refuseIfStarted?: boolean } = {},
  ) {
    const result = await this.database.transaction(async (transaction) => {
      const rows = await loadLedQueue(transaction, hallId, sessionId, { forUpdate: true });
      if (!rows.length) return null;
      const currentIndex = rows.findIndex(({ bachelorStatus }) => bachelorStatus === 'Current');
      if (options.refuseIfStarted && currentIndex >= 0) {
        throw new ConflictException({
          code: 'led/already-started',
          message: 'LED đã bắt đầu chiếu. Chọn "Bắt đầu lại" nếu muốn quay về người đầu tiên.',
        });
      }
      // Chỉ 'first' (Manager bắt đầu) được chạy khi LED chưa có người đang chiếu; mọi thao tác còn lại phải đợi bắt đầu.
      if (action !== 'first' && currentIndex < 0) {
        throw new BadRequestException('LED chưa bắt đầu. Manager cần bấm "Bắt đầu" ở trang Hàng đợi LED.');
      }
      let selectedIndex: number;
      if (typeof action === 'object') {
        const code = action.studentCode.trim().toLowerCase();
        selectedIndex = rows.findIndex((row) => row.studentCode.toLowerCase() === code);
        if (selectedIndex < 0) {
          throw new BadRequestException(
            'Không có MSSV này trong hàng đợi của phiên (chỉ người đã check-in mới có trong hàng đợi).',
          );
        }
      } else if (action === 'first' || action === 'jump-first') {
        selectedIndex = 0;
      } else {
        selectedIndex = action === 'next' ? currentIndex + 1 : currentIndex - 1;
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
      // Các trang xem hàng đợi và sơ đồ nghe sự kiện chung này để tải lại, thay vì hỏi liên tục.
      this.realtime.dataChanged('led', { hallId, sessionId });
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
