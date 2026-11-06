import { describe, expect, test } from 'bun:test';
import {
  countProgress,
  filterQueueItems,
  selectLateItems,
  type LedQueue,
  type LedQueueItem,
} from '../src/features/led/model/led-queue';

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

describe('selectLateItems', () => {
  test('tách người bị đẩy cuối và người trễ nhưng giữ ghế, bỏ qua người đúng giờ', () => {
    const queue: LedQueue = {
      total: 4,
      currentIndex: null,
      lastRegularChair: 'D07',
      items: [
        item(1, 'A01'),
        item(2, 'D07', { attendanceStatus: 2 }),
        item(3, 'Z01', { attendanceStatus: 2, isTail: true, originalChair: 'C10' }),
        item(4, 'Z02', { attendanceStatus: 2, isTail: true, originalChair: 'A07' }),
      ],
    };

    const view = selectLateItems(queue);

    expect(view.movedToEnd.map((entry) => entry.chair)).toEqual(['Z01', 'Z02']);
    expect(view.keptSeat.map((entry) => entry.chair)).toEqual(['D07']);
  });

  test('chưa có dữ liệu thì trả hai danh sách rỗng', () => {
    expect(selectLateItems(undefined)).toEqual({ movedToEnd: [], keptSeat: [] });
  });
});

describe('filterQueueItems', () => {
  const items = [
    item(1, 'A01', { fullName: 'Nguyễn Văn Đạt', studentCode: 'SE100001' }),
    item(2, 'Z01', { fullName: 'Lê Thị Hoa', studentCode: 'SE100002', originalChair: 'C10', isTail: true }),
  ];

  test('không có từ khóa thì trả nguyên danh sách', () => {
    expect(filterQueueItems(items, '  ')).toEqual(items);
  });

  test('tìm không dấu, không phân biệt hoa thường, kể cả chữ đ', () => {
    expect(filterQueueItems(items, 'nguyen van dat').map((entry) => entry.position)).toEqual([1]);
    expect(filterQueueItems(items, 'ĐẠT').map((entry) => entry.position)).toEqual([1]);
  });

  test('tìm theo MSSV và theo cả ghế hiện tại lẫn ghế gốc', () => {
    expect(filterQueueItems(items, 'se100002').map((entry) => entry.position)).toEqual([2]);
    expect(filterQueueItems(items, 'z01').map((entry) => entry.position)).toEqual([2]);
    expect(filterQueueItems(items, 'c10').map((entry) => entry.position)).toEqual([2]);
  });

  test('không khớp thì rỗng', () => {
    expect(filterQueueItems(items, 'xyz')).toEqual([]);
  });
});

describe('countProgress', () => {
  test('đếm đã chiếu, đang chiếu, chờ chiếu', () => {
    const queue: LedQueue = {
      total: 3,
      currentIndex: 1,
      lastRegularChair: 'A03',
      items: [
        item(1, 'A01', { progress: 'done' }),
        item(2, 'A02', { progress: 'current' }),
        item(3, 'A03'),
      ],
    };

    expect(countProgress(queue)).toEqual({ done: 1, current: 1, upcoming: 1 });
    expect(countProgress(undefined)).toEqual({ done: 0, current: 0, upcoming: 0 });
  });
});
