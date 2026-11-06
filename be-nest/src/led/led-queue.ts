import { and, eq } from 'drizzle-orm';
import type { AppDatabase } from '../database/database.types.js';
import { bachelors } from '../database/schema/domain-schema.js';
import { chairOrder } from './chair-order.js';

export type LedQueueRow = typeof bachelors.$inferSelect;

/** Kết nối thường hoặc transaction, đều có `select`. */
export type QueryRunner = Pick<AppDatabase, 'select'>;

/**
 * Hàng đợi LED của một (side, phiên): những người đã check-in (`status = true`), theo thứ tự gọi.
 * Đây là nguồn duy nhất cho thứ tự: MC bấm chuyển, check-in trễ, force check-in và trang xem hàng đợi đều đọc ở đây.
 * `forUpdate` khóa các dòng theo đúng thứ tự gọi để tránh deadlock giữa các luồng cùng khóa.
 */
export async function loadLedQueue(
  database: QueryRunner,
  hallId: number,
  sessionId: number,
  options: { forUpdate?: boolean } = {},
): Promise<LedQueueRow[]> {
  const query = database
    .select()
    .from(bachelors)
    .where(and(eq(bachelors.hallId, hallId), eq(bachelors.sessionId, sessionId), eq(bachelors.status, true)))
    .orderBy(...chairOrder);
  return options.forUpdate ? await query.for('update') : await query;
}

/** Người LED đang chiếu (`bachelor_status = 'Current'`), hoặc null khi LED chưa chiếu ai. */
export function findCurrent<T extends { bachelorStatus: string | null }>(rows: T[]): T | null {
  return rows.find(({ bachelorStatus }) => bachelorStatus === 'Current') ?? null;
}
