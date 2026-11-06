import { describe, expect, test } from 'bun:test';
import { BadRequestException, ConflictException } from '@nestjs/common';
import type { AppDatabase } from '../database/database.types.js';
import type { RealtimeService } from '../realtime/realtime.service.js';
import { LedService } from './led.service.js';

type Row = Record<string, unknown>;

const person = (id: number, chair: string, bachelorStatus: string | null = null): Row => ({
  id,
  studentCode: `SV${id}`,
  fullName: `Tên ${id}`,
  chair,
  bachelorStatus,
});

/** DB giả: hàng đợi cố định, ghi lại mọi UPDATE và mọi gói realtime đã phát. */
function createService(rows: Row[]) {
  const updates: Row[] = [];
  const emitted: string[] = [];
  const changes: { topic: string; scope: unknown }[] = [];
  const chain: Record<string, unknown> = {};
  for (const name of ['from', 'where', 'orderBy', 'for']) chain[name] = () => chain;
  chain.then = (resolve: (value: Row[]) => unknown) => Promise.resolve(rows).then(resolve);
  const transaction = {
    select: () => chain,
    update: () => ({
      set: (values: Row) => ({
        where: () => {
          updates.push(values);
          return Promise.resolve();
        },
      }),
    }),
  };
  const database = {
    select: () => chain,
    transaction: (operation: (value: typeof transaction) => Promise<unknown>) => operation(transaction),
  } as unknown as AppDatabase;
  const realtime = {
    emitAll: (_event: string, data: string) => emitted.push(data),
    dataChanged: (topic: string, scope: unknown) => changes.push({ topic, scope }),
  } as unknown as RealtimeService;
  return { service: new LedService(database, realtime), updates, emitted, changes };
}

describe('LedService.current (chỉ đọc)', () => {
  test('chưa ai là Current: trả về notStarted và không ghi, không phát gì', async () => {
    const { service, updates, emitted } = createService([person(1, 'A1'), person(2, 'A2')]);

    expect(await service.current(1, 7)).toEqual({ notStarted: true });
    expect(updates).toHaveLength(0);
    expect(emitted).toHaveLength(0);
  });

  test('hàng đợi trống cũng là chưa bắt đầu', async () => {
    const { service, updates } = createService([]);

    expect(await service.current(1, 7)).toEqual({ notStarted: true });
    expect(updates).toHaveLength(0);
  });

  test('đã bắt đầu: trả về người trước, người đang chiếu, người sau mà không ghi', async () => {
    const { service, updates } = createService([
      person(1, 'A1', 'Back'),
      person(2, 'A2', 'Current'),
      person(3, 'A3', 'Next'),
    ]);

    const window = await service.current(1, 7);

    expect(window).toMatchObject({ previous: { id: 1 }, selected: { id: 2 }, next: { id: 3 } });
    expect(updates).toHaveLength(0);
  });
});

describe('LedService.start', () => {
  test('chưa bắt đầu: đặt Current vào người đầu hàng đợi và phát cho màn LED', async () => {
    const { service, updates, emitted } = createService([person(1, 'A1'), person(2, 'A2'), person(3, 'A3')]);

    const result = await service.start(1, 7);

    expect(result).toMatchObject({ selected: { id: 1 }, next: { id: 2 }, previous: null });
    expect(updates).toEqual([
      { bachelorStatus: null },
      { bachelorStatus: 'Current' },
      { bachelorStatus: 'Next' },
    ]);
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toContain('CurrentBachelor');
    expect(emitted[0]).toContain('SV1');
  });

  test('báo cho các trang xem hàng đợi và sơ đồ tải lại: chỉ khi thật sự đổi người đang chiếu', async () => {
    const started = createService([person(1, 'A1'), person(2, 'A2')]);
    await started.service.start(1, 7);
    expect(started.changes).toEqual([{ topic: 'led', scope: { hallId: 1, sessionId: 7 } }]);

    const refused = createService([person(1, 'A1', 'Current'), person(2, 'A2')]);
    await refused.service.start(1, 7).catch(() => undefined);
    expect(refused.changes).toHaveLength(0);

    const peek = createService([person(1, 'A1', 'Current'), person(2, 'A2')]);
    await peek.service.current(1, 7);
    expect(peek.changes).toHaveLength(0);
  });

  test('đã bắt đầu thì từ chối, không ghi và không phát', async () => {
    const { service, updates, emitted } = createService([person(1, 'A1', 'Back'), person(2, 'A2', 'Current')]);

    expect(await service.start(1, 7).catch((value: unknown) => value)).toBeInstanceOf(ConflictException);
    expect(updates).toHaveLength(0);
    expect(emitted).toHaveLength(0);
  });

  test('bắt đầu lại: về người đầu tiên dù LED đã bắt đầu', async () => {
    const { service, updates } = createService([person(1, 'A1', 'Back'), person(2, 'A2', 'Current')]);

    const result = await service.start(1, 7, true);

    expect(result).toMatchObject({ selected: { id: 1 } });
    expect(updates).toContainEqual({ bachelorStatus: 'Current' });
  });

  test('chưa có ai check-in thì không có gì để bắt đầu', async () => {
    const { service, updates } = createService([]);

    expect(await service.start(1, 7)).toBeNull();
    expect(updates).toHaveLength(0);
  });
});

describe('LedService.next / previous', () => {
  test('chưa bắt đầu: báo Manager cần bấm Bắt đầu, không tự chọn ai', async () => {
    const { service, updates } = createService([person(1, 'A1'), person(2, 'A2')]);

    const error = await service.next(1, 7).catch((value: unknown) => value);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as Error).message).toContain('chưa bắt đầu');
    expect(updates).toHaveLength(0);
    expect(await service.previous(1, 7).catch((value: unknown) => value)).toBeInstanceOf(BadRequestException);
  });

  test('đã bắt đầu: Next đi tới người kế tiếp', async () => {
    const { service } = createService([person(1, 'A1', 'Current'), person(2, 'A2', 'Next'), person(3, 'A3')]);

    expect(await service.next(1, 7)).toMatchObject({ selected: { id: 2 }, previous: { id: 1 }, next: { id: 3 } });
  });

  test('ở người cuối thì báo biên, không ghi', async () => {
    const { service, updates } = createService([person(1, 'A1', 'Back'), person(2, 'A2', 'Current')]);

    expect(await service.next(1, 7)).toEqual({ boundary: 'last' });
    expect(updates).toHaveLength(0);
  });
});

describe('LedService.jump', () => {
  const started = () => [
    person(1, 'A1', 'Back'),
    person(2, 'A2', 'Current'),
    person(3, 'A3', 'Next'),
    person(4, 'B1'),
    person(5, 'B2'),
  ];

  test('nhảy tới MSSV: người đó thành Current, người trước và sau theo hàng đợi, phát cho màn LED', async () => {
    const { service, updates, emitted } = createService(started());

    const result = await service.jump(1, 7, { studentCode: 'sv5' });

    expect(result).toMatchObject({ selected: { id: 5 }, previous: { id: 4 }, next: null });
    expect(updates).toEqual([{ bachelorStatus: null }, { bachelorStatus: 'Back' }, { bachelorStatus: 'Current' }]);
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toContain('SV5');
  });

  test('nhảy lùi cũng được (MC chiếu sót một người)', async () => {
    const { service } = createService(started());

    expect(await service.jump(1, 7, { studentCode: 'SV1' })).toMatchObject({
      selected: { id: 1 },
      previous: null,
      next: { id: 2 },
    });
  });

  test('về đầu: người đầu hàng đợi thành Current', async () => {
    const { service } = createService(started());

    expect(await service.jump(1, 7, 'first')).toMatchObject({ selected: { id: 1 } });
  });

  test('LED chưa bắt đầu thì không nhảy được, kể cả về đầu: bắt đầu là việc của Manager', async () => {
    const { service, updates } = createService([person(1, 'A1'), person(2, 'A2')]);

    const byCode = await service.jump(1, 7, { studentCode: 'SV2' }).catch((value: unknown) => value);
    const toFirst = await service.jump(1, 7, 'first').catch((value: unknown) => value);

    expect(byCode).toBeInstanceOf(BadRequestException);
    expect(toFirst).toBeInstanceOf(BadRequestException);
    expect((toFirst as Error).message).toContain('chưa bắt đầu');
    expect(updates).toHaveLength(0);
  });

  test('MSSV không có trong hàng đợi (chưa check-in) thì báo rõ và không ghi', async () => {
    const { service, updates, emitted } = createService(started());

    const error = await service.jump(1, 7, { studentCode: 'SV999' }).catch((value: unknown) => value);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as Error).message).toContain('chỉ người đã check-in');
    expect(updates).toHaveLength(0);
    expect(emitted).toHaveLength(0);
  });
});
