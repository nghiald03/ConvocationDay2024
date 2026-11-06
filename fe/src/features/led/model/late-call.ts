import { ATTENDANCE_LATE, type LedQueue, type LedQueueItem } from './led-queue';

/** Chỗ người đó thực sự đang ngồi: ghế cũ nếu bị xếp xuống cuối (ghế hiện tại là ghế ảo ở hàng Z), không thì ghế hiện tại. */
export function sittingSeat(item: Pick<LedQueueItem, 'chair' | 'originalChair'>): string | null {
  return item.originalChair ?? item.chair;
}

/**
 * Còn mấy lượt nữa thì LED gọi tới người này: 0 là đang gọi, null là đã gọi xong hoặc LED chưa bắt đầu.
 * `position` đếm từ 1 trong hàng đợi, `currentIndex` đếm từ 0.
 */
export function turnsAway(position: number, currentIndex: number | null): number | null {
  if (currentIndex === null) return null;
  const away = position - (currentIndex + 1);
  return away >= 0 ? away : null;
}

export type UpcomingLate = { item: LedQueueItem; turnsAway: number | null };

/**
 * Cho điều phối: người đến trễ đang được gọi trên LED, và những người đến trễ sắp được gọi theo thứ tự.
 * Người đến trễ vẫn ngồi ghế cũ, nên điều phối cần biết đúng lúc để dẫn họ lên.
 */
export function selectCallStrip(queue: LedQueue | undefined, limit = 3) {
  const late = (queue?.items ?? []).filter((item) => item.attendanceStatus === ATTENDANCE_LATE);
  const currentIndex = queue?.currentIndex ?? null;
  return {
    calling: late.find((item) => item.progress === 'current') ?? null,
    upcoming: late
      .filter((item) => item.progress === 'upcoming')
      .sort((a, b) => a.position - b.position)
      .slice(0, limit)
      .map((item): UpcomingLate => ({ item, turnsAway: turnsAway(item.position, currentIndex) })),
  };
}
