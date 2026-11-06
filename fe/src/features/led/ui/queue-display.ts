import type { LedQueueItem } from '../model/led-queue';

export const PROGRESS: Record<
  LedQueueItem['progress'],
  { label: string; color: 'secondary' | 'success' | 'warning' }
> = {
  done: { label: 'Đã chiếu', color: 'secondary' },
  current: { label: 'Đang chiếu', color: 'success' },
  upcoming: { label: 'Chờ chiếu', color: 'warning' },
};

export function formatTime(value: string | null) {
  if (!value) return '-';
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? '-' : time.toLocaleTimeString('vi-VN');
}
