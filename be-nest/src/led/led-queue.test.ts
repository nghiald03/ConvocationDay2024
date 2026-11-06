import { describe, expect, test } from 'bun:test';
import type { AppDatabase } from '../database/database.types.js';
import type { RealtimeService } from '../realtime/realtime.service.js';
import { LedService } from './led.service.js';

type Row = Record<string, unknown>;

function createService(rows: Row[]) {
  const chain: Record<string, unknown> = {};
  for (const name of ['from', 'where', 'orderBy', 'for']) chain[name] = () => chain;
  chain.then = (resolve: (value: Row[]) => unknown) => Promise.resolve(rows).then(resolve);
  const database = { select: () => chain } as unknown as AppDatabase;
  return new LedService(database, {} as RealtimeService);
}

const person = (id: number, chair: string, extra: Row = {}) => ({
  id,
  studentCode: `SV${id}`,
  fullName: `Tên ${id}`,
  chair,
  originalChair: null,
  bachelorStatus: null,
  attendanceStatus: 1,
  timeCheckIn: null,
  ...extra,
});

describe('LedService.queue', () => {
  test('giữ nguyên thứ tự truy vấn, đánh dấu đã chiếu, đang chiếu, sắp chiếu', async () => {
    const service = createService([
      person(1, 'A01', { bachelorStatus: 'Back' }),
      person(2, 'A02', { bachelorStatus: 'Current' }),
      person(3, 'A04', { bachelorStatus: 'Next' }),
      person(4, 'B03'),
    ]);

    const queue = await service.queue(1, 7);

    expect(queue.total).toBe(4);
    expect(queue.currentIndex).toBe(1);
    expect(queue.items.map((item) => item.position)).toEqual([1, 2, 3, 4]);
    expect(queue.items.map((item) => item.progress)).toEqual(['done', 'current', 'upcoming', 'upcoming']);
  });

  test('LED chưa chiếu ai: currentIndex rỗng và mọi người đều sắp chiếu', async () => {
    const queue = await createService([person(1, 'A01'), person(2, 'A02')]).queue(1, 7);

    expect(queue.currentIndex).toBeNull();
    expect(queue.items.every((item) => item.progress === 'upcoming')).toBe(true);
  });

  test('người ở hàng Z là isTail và không tính là người cuối bình thường', async () => {
    const queue = await createService([
      person(1, 'A01'),
      person(2, 'I24'),
      person(3, 'Z01', { originalChair: 'C10', attendanceStatus: 2 }),
      person(4, 'Z02', { originalChair: 'D24', attendanceStatus: 2 }),
    ]).queue(1, 7);

    expect(queue.items.map((item) => item.isTail)).toEqual([false, false, true, true]);
    expect(queue.lastRegularChair).toBe('I24');
    expect(queue.items[2]).toMatchObject({ chair: 'Z01', originalChair: 'C10', attendanceStatus: 2 });
  });

  test('hàng đợi trống', async () => {
    const queue = await createService([]).queue(1, 7);

    expect(queue).toEqual({ total: 0, currentIndex: null, lastRegularChair: null, items: [] });
  });
});
