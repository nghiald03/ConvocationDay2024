import { describe, expect, test } from 'bun:test';
import {
  compareSides,
  formatDuration,
  paceMs,
  recordPace,
  summarizeProgress,
  type PaceSample,
} from '../src/features/led/model/led-progress';
import type { LedQueue, LedQueueItem } from '../src/features/led/model/led-queue';

const item = (position: number, extra: Partial<LedQueueItem> = {}): LedQueueItem => ({
  position,
  id: position,
  studentCode: `SV${position}`,
  fullName: `Tên ${position}`,
  chair: `A${position}`,
  originalChair: null,
  bachelorStatus: null,
  attendanceStatus: 1,
  timeCheckIn: null,
  isTail: false,
  progress: 'upcoming',
  ...extra,
});

const queue = (count: number, currentIndex: number | null, tail: number[] = []): LedQueue => ({
  total: count,
  currentIndex,
  lastRegularChair: null,
  items: Array.from({ length: count }, (_, index) => item(index + 1, { isTail: tail.includes(index + 1) })),
});

describe('summarizeProgress', () => {
  test('chưa bắt đầu: chưa chiếu ai, tất cả còn chờ', () => {
    const summary = summarizeProgress(queue(5, null));
    expect(summary).toMatchObject({ total: 5, shown: 0, remaining: 5, percent: 0, started: false, current: null });
    expect(summary.upcoming.map((row) => row.position)).toEqual([1, 2, 3]);
  });

  test('đang chiếu: tính cả người đang chiếu, liệt kê người kế tiếp và người trễ còn chờ', () => {
    const summary = summarizeProgress(queue(10, 2, [9, 10]), 2);
    expect(summary).toMatchObject({ shown: 3, remaining: 7, percent: 30, started: true, remainingTail: 2 });
    expect(summary.current?.position).toBe(3);
    expect(summary.upcoming.map((row) => row.position)).toEqual([4, 5]);
  });

  test('người cuối: 100%, không còn ai', () => {
    expect(summarizeProgress(queue(3, 2))).toMatchObject({ percent: 100, remaining: 0, upcoming: [] });
  });

  test('chưa có dữ liệu hoặc hàng đợi rỗng', () => {
    expect(summarizeProgress(undefined)).toMatchObject({ total: 0, percent: 0, started: false });
  });
});

describe('nhịp chiếu', () => {
  const run = (points: [number, number][]) =>
    points.reduce<PaceSample[]>((samples, [index, at]) => recordPace(samples, { index, at }), []);

  test('cần ít nhất 2 lần chuyển mới ước lượng', () => {
    expect(paceMs(run([[0, 0]]))).toBeNull();
    expect(paceMs(run([[0, 0], [1, 10_000]]))).toBeNull();
    expect(paceMs(run([[0, 0], [1, 10_000], [2, 30_000]]))).toBe(15_000);
  });

  test('tải lại cùng vị trí không làm hỏng nhịp; nhảy nhiều người một lúc tính theo số người', () => {
    expect(paceMs(run([[0, 0], [0, 5_000], [1, 10_000], [4, 40_000]]))).toBe(10_000);
  });

  test('MC lùi lại thì đếm lại từ đầu', () => {
    expect(run([[3, 0], [4, 10_000], [2, 20_000]])).toEqual([{ index: 2, at: 20_000 }]);
  });

  test('chỉ giữ cửa sổ gần nhất', () => {
    const samples = run(Array.from({ length: 30 }, (_, index) => [index, index * 1000] as [number, number]));
    expect(samples).toHaveLength(13);
    expect(samples[0]?.index).toBe(17);
  });
});

describe('formatDuration và thứ tự side', () => {
  test('định dạng thời gian', () => {
    expect(formatDuration(44_600)).toBe('45 giây');
    expect(formatDuration(3 * 60_000)).toBe('3 phút');
    expect(formatDuration(65 * 60_000)).toBe('1 giờ 05 phút');
  });

  test('bên trái trước bên phải', () => {
    const halls = [{ hallName: 'Right' }, { hallName: 'Left' }];
    expect([...halls].sort(compareSides).map((hall) => hall.hallName)).toEqual(['Left', 'Right']);
  });
});
