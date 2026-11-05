type Scheduler = {
  set: (callback: () => void, delayMs: number) => unknown;
  clear: (handle: unknown) => void;
};

const browserScheduler: Scheduler = {
  set: (callback, delayMs) => setTimeout(callback, delayMs),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/**
 * Phân biệt nhấn thường với nhấn nhanh liên tiếp trên cùng một hàng.
 * Nhấn đủ `count` lần (mỗi lần cách nhau < windowMs) gọi onBurst; ít hơn thì gọi onSingle một lần.
 */
export function createClickBurst<T>(options: {
  count: number;
  windowMs: number;
  onSingle: (value: T) => void;
  onBurst: (value: T) => void;
  scheduler?: Scheduler;
}) {
  const scheduler = options.scheduler ?? browserScheduler;
  const pending = new Map<string, { clicks: number; handle: unknown }>();

  return (key: string, value: T) => {
    const state = pending.get(key) ?? { clicks: 0, handle: undefined };
    if (state.handle !== undefined) scheduler.clear(state.handle);
    state.clicks += 1;
    if (state.clicks >= options.count) {
      pending.delete(key);
      options.onBurst(value);
      return;
    }
    state.handle = scheduler.set(() => {
      pending.delete(key);
      options.onSingle(value);
    }, options.windowMs);
    pending.set(key, state);
  };
}
