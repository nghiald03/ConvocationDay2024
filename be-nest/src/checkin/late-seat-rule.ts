import { parseRowSeat } from '../bachelor/next-chair-at-end.js';

/**
 * Phiên đã đóng: hàng của người đến trễ phải cách hàng LED đang chiếu ít nhất chừng này hàng
 * thì mới giữ được ghế (LED ở hàng A thì từ hàng D trở đi). Hàng gần hơn điều phối đã xếp sẵn người.
 */
export const KEEP_SEAT_MIN_ROW_GAP = 3;

const GRID_ROWS = 'ABCDEFGHIJ';
/** Chỉ số của mọi hàng ngoài lưới A–J (hàng ảo Z, ZA...): đứng sau toàn bộ lưới. */
const BEYOND_GRID = GRID_ROWS.length;

export type LateSeatDecision = 'keep' | 'move-to-end';

function gridRowIndex(chair: string | null | undefined): number | null {
  const seat = chair ? parseRowSeat(chair.trim()) : null;
  if (!seat || seat.row.length !== 1) return null;
  const index = GRID_ROWS.indexOf(seat.row);
  return index < 0 ? null : index;
}

/** Ghế thuộc lưới A–J, tức ghế thật mà sơ đồ chỗ ngồi vẽ được. */
export function isGridChair(chair: string | null | undefined): boolean {
  return gridRowIndex(chair) !== null;
}

function currentRowIndex(chair: string | null | undefined): number {
  const seat = chair ? parseRowSeat(chair.trim()) : null;
  if (!seat) return BEYOND_GRID;
  return gridRowIndex(chair) ?? BEYOND_GRID;
}

/**
 * @param targetChair ghế của người vừa đến trễ
 * @param currentChair ghế của người LED đang chiếu; null khi LED chưa chiếu, tính như hàng A
 */
export function decideLateSeat(
  targetChair: string | null | undefined,
  currentChair: string | null | undefined,
): LateSeatDecision {
  const target = gridRowIndex(targetChair);
  if (target === null) return 'move-to-end';
  const current = currentChair ? currentRowIndex(currentChair) : 0;
  return target >= current + KEEP_SEAT_MIN_ROW_GAP ? 'keep' : 'move-to-end';
}
