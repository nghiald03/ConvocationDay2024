import { describe, expect, test } from 'bun:test';
import type { LedQueue, LedQueueItem } from '../src/features/led/model/led-queue';
import { selectCallStrip, sittingSeat, turnsAway } from '../src/features/led/model/late-call';

const item = (position: number, chair: string, extra: Partial<LedQueueItem> = {}): LedQueueItem => ({
  position,
  id: position,
  studentCode: `SV${position}`,
  fullName: `Tên ${position}`,
  chair,
  originalChair: null,
  bachelorStatus: null,
  attendanceStatus: 1,
  timeCheckIn: null,
  isTail: false,
  progress: 'upcoming',
  ...extra,
});

describe('sittingSeat', () => {
  test('bị xếp xuống cuối thì ngồi ở ghế cũ, còn lại là ghế hiện tại', () => {
    expect(sittingSeat({ chair: 'Z1', originalChair: 'C10' })).toBe('C10');
    expect(sittingSeat({ chair: 'D1', originalChair: null })).toBe('D1');
    expect(sittingSeat({ chair: null, originalChair: null })).toBeNull();
  });
});

describe('turnsAway', () => {
  test('đếm số lượt còn lại tới người đó', () => {
    expect(turnsAway(5, 4)).toBe(0);
    expect(turnsAway(8, 4)).toBe(3);
  });

  test('đã gọi xong hoặc LED chưa bắt đầu thì không có', () => {
    expect(turnsAway(2, 4)).toBeNull();
    expect(turnsAway(8, null)).toBeNull();
  });
});

describe('selectCallStrip', () => {
  const late = (position: number, chair: string, original: string, extra: Partial<LedQueueItem> = {}) =>
    item(position, chair, { attendanceStatus: 2, isTail: true, originalChair: original, ...extra });

  const queue = (currentIndex: number | null, items: LedQueueItem[]): LedQueue => ({
    total: items.length,
    currentIndex,
    lastRegularChair: 'A3',
    items,
  });

  test('đang gọi một người đến trễ: nêu người đó và những người trễ sắp tới kèm số lượt còn lại', () => {
    const strip = selectCallStrip(
      queue(3, [
        item(1, 'A1', { progress: 'done' }),
        item(2, 'A2', { progress: 'done' }),
        item(3, 'A3', { progress: 'done' }),
        late(4, 'Z1', 'C10', { progress: 'current' }),
        late(5, 'Z2', 'B5'),
        late(6, 'Z3', 'D7'),
      ]),
    );

    expect(strip.calling?.id).toBe(4);
    expect(strip.upcoming.map((entry) => [entry.item.id, entry.turnsAway])).toEqual([
      [5, 1],
      [6, 2],
    ]);
  });

  test('chỉ nêu tối đa số người sắp gọi theo giới hạn, đúng thứ tự', () => {
    const items = [
      item(1, 'A1', { progress: 'current' }),
      late(2, 'Z1', 'C1'),
      late(3, 'Z2', 'C2'),
      late(4, 'Z3', 'C3'),
      late(5, 'Z4', 'C4'),
    ];

    expect(selectCallStrip(queue(0, items), 2).upcoming.map((entry) => entry.item.id)).toEqual([2, 3]);
  });

  test('người đang chiếu đúng giờ thì chưa có ai đang gọi trong nhóm trễ', () => {
    const strip = selectCallStrip(queue(0, [item(1, 'A1', { progress: 'current' }), late(2, 'Z1', 'C1')]));

    expect(strip.calling).toBeNull();
    expect(strip.upcoming[0]).toMatchObject({ turnsAway: 1 });
  });

  test('LED chưa bắt đầu hoặc chưa có dữ liệu: không có số lượt', () => {
    expect(selectCallStrip(queue(null, [late(1, 'Z1', 'C1')])).upcoming[0]?.turnsAway).toBeNull();
    expect(selectCallStrip(undefined)).toEqual({ calling: null, upcoming: [] });
  });

  test('người trễ nhưng giữ ghế cũng được tính', () => {
    const strip = selectCallStrip(
      queue(0, [item(1, 'A1', { progress: 'current' }), item(2, 'D1', { attendanceStatus: 2 })]),
    );

    expect(strip.upcoming.map((entry) => entry.item.chair)).toEqual(['D1']);
  });
});
