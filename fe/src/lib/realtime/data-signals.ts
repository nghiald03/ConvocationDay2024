/** Chủ đề trong sự kiện `data:changed` của backend. */
export type DataChangeTopic = 'checkin' | 'bachelor' | 'led';

export type QueryKeyPrefix = readonly string[];

/** Danh sách điểm danh, sơ đồ ghế, thống kê và hàng đợi LED cùng phụ thuộc vào dữ liệu tân cử nhân. */
const BACHELOR_DATA_KEYS: readonly QueryKeyPrefix[] = [
  ['led'],
  ['bachelors'],
  ['bachelors-by-session'],
  ['statistics'],
  ['seat-map'],
  ['seat-map-2'],
];

const KEYS_BY_TOPIC: Record<DataChangeTopic, readonly QueryKeyPrefix[]> = {
  checkin: BACHELOR_DATA_KEYS,
  bachelor: BACHELOR_DATA_KEYS,
  led: [['led']],
};

/** Các nhóm khóa truy vấn cần tải lại cho các chủ đề vừa đổi (bỏ chủ đề lạ, không trùng). */
export function queryKeysForTopics(topics: readonly string[]): QueryKeyPrefix[] {
  const seen = new Map<string, QueryKeyPrefix>();
  for (const topic of topics) {
    for (const key of KEYS_BY_TOPIC[topic as DataChangeTopic] ?? []) seen.set(key.join('\u0000'), key);
  }
  return [...seen.values()];
}

type Scheduler = {
  set: (callback: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
  random: () => number;
};

const realScheduler: Scheduler = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  random: Math.random,
};

/**
 * Gom các sự kiện đến dồn dập thành một lần xử lý, sau `delayMs` cộng thêm một khoảng ngẫu nhiên tới `jitterMs`
 * để nhiều máy không cùng tải lại một lúc. Một đợt check-in đông chỉ gây tối đa một lần tải mỗi khoảng gom.
 */
export function createCoalescer<T>(
  flush: (items: T[]) => void,
  delayMs: number,
  jitterMs: number,
  scheduler: Scheduler = realScheduler,
) {
  let items: T[] = [];
  let handle: unknown = null;
  return {
    push(item: T) {
      items.push(item);
      handle ??= scheduler.set(() => {
        const batch = items;
        items = [];
        handle = null;
        flush(batch);
      }, delayMs + scheduler.random() * jitterMs);
    },
    cancel() {
      if (handle !== null) scheduler.clear(handle);
      handle = null;
      items = [];
    },
  };
}
