import { beforeEach, describe, expect, test } from 'bun:test';
import { createCoalescer, queryKeysForTopics } from '../src/lib/realtime/data-signals';
import {
  fallbackInterval,
  isRealtimeConnected,
  setRealtimeConnected,
} from '../src/lib/realtime/realtime-status';

describe('queryKeysForTopics', () => {
  test('điểm danh và danh sách tân cử nhân tải lại sơ đồ, thống kê, danh sách và hàng đợi LED', () => {
    for (const topic of ['checkin', 'bachelor']) {
      const keys = queryKeysForTopics([topic]).map((key) => key[0]);
      expect(keys).toEqual(['led', 'bachelors', 'bachelors-by-session', 'statistics', 'seat-map', 'seat-map-2']);
    }
  });

  test('chủ đề LED chỉ tải lại nhóm LED', () => {
    expect(queryKeysForTopics(['led'])).toEqual([['led']]);
  });

  test('nhiều chủ đề thì gộp không trùng, chủ đề lạ bị bỏ qua', () => {
    const keys = queryKeysForTopics(['checkin', 'led', 'khong-co', 'bachelor']);

    expect(keys.filter((key) => key[0] === 'led')).toHaveLength(1);
    expect(keys).toHaveLength(6);
    expect(queryKeysForTopics(['khong-co'])).toEqual([]);
    expect(queryKeysForTopics([])).toEqual([]);
  });
});

describe('createCoalescer', () => {
  /** Bộ hẹn giờ giả: giữ lại các tác vụ để test tự chạy khi muốn. */
  function fakeScheduler(random = 0.5) {
    const tasks = new Map<number, { callback: () => void; ms: number }>();
    let next = 1;
    return {
      tasks,
      scheduler: {
        set: (callback: () => void, ms: number) => {
          const id = next++;
          tasks.set(id, { callback, ms });
          return id;
        },
        clear: (handle: unknown) => tasks.delete(handle as number),
        random: () => random,
      },
      runAll: () => [...tasks.values()].forEach((task) => task.callback()),
    };
  }

  test('nhiều sự kiện trong một khoảng chỉ xử lý một lần, gộp đủ nội dung', () => {
    const fake = fakeScheduler();
    const batches: string[][] = [];
    const coalescer = createCoalescer<string>((items) => batches.push(items), 400, 300, fake.scheduler);

    coalescer.push('a');
    coalescer.push('b');
    coalescer.push('c');

    expect(fake.tasks.size).toBe(1);
    fake.runAll();
    expect(batches).toEqual([['a', 'b', 'c']]);
  });

  test('độ trễ là mức gom cộng một khoảng ngẫu nhiên để các máy không tải lại cùng lúc', () => {
    const fake = fakeScheduler(0.5);
    const coalescer = createCoalescer<number>(() => undefined, 400, 300, fake.scheduler);

    coalescer.push(1);

    expect([...fake.tasks.values()][0]!.ms).toBe(550);
  });

  test('sau khi xử lý thì đợt mới bắt đầu lại; hủy thì bỏ hết sự kiện đang chờ', () => {
    const fake = fakeScheduler();
    const batches: number[][] = [];
    const coalescer = createCoalescer<number>((items) => batches.push(items), 100, 0, fake.scheduler);

    coalescer.push(1);
    fake.runAll();
    fake.tasks.clear();
    coalescer.push(2);
    coalescer.cancel();

    expect(fake.tasks.size).toBe(0);
    expect(batches).toEqual([[1]]);
  });
});

describe('fallbackInterval', () => {
  beforeEach(() => setRealtimeConnected(false));

  test('websocket đang nối thì không hỏi, mất kết nối thì hỏi dự phòng theo chu kỳ', () => {
    const interval = fallbackInterval(5000);

    expect(interval()).toBe(5000);
    setRealtimeConnected(true);
    expect(isRealtimeConnected()).toBe(true);
    expect(interval()).toBe(false);
    setRealtimeConnected(false);
    expect(interval()).toBe(5000);
  });
});
