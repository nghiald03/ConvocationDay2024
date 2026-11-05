import { describe, expect, test } from 'bun:test';
import { createClickBurst } from '../src/features/check-in/model/click-burst';

function manualScheduler() {
  let nextId = 0;
  const timers = new Map<number, () => void>();
  return {
    scheduler: {
      set: (callback: () => void) => {
        nextId += 1;
        timers.set(nextId, callback);
        return nextId;
      },
      clear: (handle: unknown) => {
        timers.delete(handle as number);
      },
    },
    elapse: () => {
      const callbacks = [...timers.values()];
      timers.clear();
      callbacks.forEach((callback) => callback());
    },
  };
}

function setup() {
  const clock = manualScheduler();
  const calls: string[] = [];
  const click = createClickBurst<string>({
    count: 4,
    windowMs: 450,
    onSingle: (value) => calls.push(`single:${value}`),
    onBurst: (value) => calls.push(`burst:${value}`),
    scheduler: clock.scheduler,
  });
  return { click, calls, elapse: clock.elapse };
}

describe('createClickBurst', () => {
  test('một lần nhấn vẫn là check-in thường', () => {
    const { click, calls, elapse } = setup();
    click('SV1', 'SV1');
    expect(calls).toEqual([]);
    elapse();
    expect(calls).toEqual(['single:SV1']);
  });

  test('nhấn nhanh 4 lần mở force check-in và không kèm check-in thường', () => {
    const { click, calls, elapse } = setup();
    for (let index = 0; index < 4; index += 1) click('SV1', 'SV1');
    elapse();
    expect(calls).toEqual(['burst:SV1']);
  });

  test('nhấn 3 lần rồi dừng chỉ check-in thường một lần', () => {
    const { click, calls, elapse } = setup();
    for (let index = 0; index < 3; index += 1) click('SV1', 'SV1');
    elapse();
    expect(calls).toEqual(['single:SV1']);
  });

  test('đếm riêng từng tân cử nhân', () => {
    const { click, calls, elapse } = setup();
    click('SV1', 'SV1');
    click('SV2', 'SV2');
    click('SV1', 'SV1');
    click('SV2', 'SV2');
    elapse();
    expect(calls.sort()).toEqual(['single:SV1', 'single:SV2']);
  });
});
