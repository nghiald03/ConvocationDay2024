import type { LedQueue, LedQueueItem } from './led-queue';

/** Phiên đang chiếu LED của một side, do `GET /Mc/Active` trả về. */
export type LedActiveSession = {
  hallId: number;
  hallName: string;
  sessionId: number;
  sessionNumber: number | null;
  sessionInDay: number | null;
  description: string | null;
};

export type ProgressSummary = {
  total: number;
  /** Đã lên LED, tính cả người đang chiếu. */
  shown: number;
  /** Còn chờ sau người đang chiếu. */
  remaining: number;
  /** 0–100, làm tròn xuống để 100% chỉ khi đã tới người cuối. */
  percent: number;
  started: boolean;
  current: LedQueueItem | null;
  upcoming: LedQueueItem[];
  /** Người đến trễ bị xếp xuống cuối (hàng Z) còn chờ. */
  remainingTail: number;
};

export function summarizeProgress(queue: LedQueue | undefined, upcomingCount = 3): ProgressSummary {
  const items = queue?.items ?? [];
  const index = queue?.currentIndex ?? null;
  const shown = index === null ? 0 : index + 1;
  const after = index === null ? items : items.slice(index + 1);
  return {
    total: items.length,
    shown,
    remaining: after.length,
    percent: items.length === 0 ? 0 : Math.floor((shown / items.length) * 100),
    started: index !== null,
    current: index === null ? null : (items[index] ?? null),
    upcoming: after.slice(0, upcomingCount),
    remainingTail: after.filter((item) => item.isTail).length,
  };
}

/** Một lần quan sát vị trí đang chiếu (theo tín hiệu socket) và thời điểm thấy nó. */
export type PaceSample = { index: number; at: number };

/** Số lần chuyển gần nhất dùng để tính nhịp, để nhịp theo kịp khi MC đổi tốc độ. */
export const PACE_WINDOW = 12;

/**
 * Thêm một quan sát. Chỉ giữ chuỗi đi tới liên tục: MC lùi lại hoặc nhảy về đầu thì bắt đầu đếm lại,
 * vì khoảng thời gian đó không phản ánh nhịp chiếu.
 */
export function recordPace(samples: readonly PaceSample[], sample: PaceSample): PaceSample[] {
  const last = samples.at(-1);
  if (last && sample.index === last.index) return [...samples];
  if (last && sample.index < last.index) return [sample];
  return [...samples, sample].slice(-(PACE_WINDOW + 1));
}

/** Trung bình mili-giây cho mỗi người; null khi chưa đủ 2 lần chuyển để ước lượng. */
export function paceMs(samples: readonly PaceSample[]): number | null {
  if (samples.length < 3) return null;
  const first = samples[0]!;
  const last = samples.at(-1)!;
  const steps = last.index - first.index;
  return steps > 0 ? (last.at - first.at) / steps : null;
}

/** "45 giây", "3 phút", "1 giờ 05 phút". */
export function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds} giây`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} phút`;
  return `${Math.floor(minutes / 60)} giờ ${String(minutes % 60).padStart(2, '0')} phút`;
}

/** Tên hiển thị của side. */
export function sideLabel(hallName: string): string {
  const name = hallName.trim().toLowerCase();
  if (name === 'left') return 'Bên trái';
  if (name === 'right') return 'Bên phải';
  return hallName;
}

/** Bên trái trước, bên phải sau, các side khác theo tên. */
export function compareSides(a: { hallName: string }, b: { hallName: string }): number {
  const rank = (name: string) => ({ left: 0, right: 1 })[name.trim().toLowerCase()] ?? 2;
  return rank(a.hallName) - rank(b.hallName) || a.hallName.localeCompare(b.hallName);
}
