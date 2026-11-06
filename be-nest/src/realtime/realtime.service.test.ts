import { describe, expect, test } from 'bun:test';
import { DATA_CHANGE_COALESCE_MS, RealtimeService } from './realtime.service.js';

type Emitted = { event: string; payload: { data: { topics: string[]; hallIds: number[]; sessionIds: number[] } } };

function createService() {
  const emitted: Emitted[] = [];
  const service = new RealtimeService();
  service.attach({ emit: (event: string, payload: Emitted['payload']) => emitted.push({ event, payload }) } as never);
  return { service, emitted };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('RealtimeService.dataChanged', () => {
  test('gom nhiều thay đổi dồn dập thành một sự kiện, gộp chủ đề, side và phiên', () => {
    const { service, emitted } = createService();

    service.dataChanged('checkin', { hallId: 1, sessionId: 7 });
    service.dataChanged('checkin', { hallId: 1, sessionId: 7 });
    service.dataChanged('led', { hallId: 2, sessionId: 7 });
    expect(emitted).toHaveLength(0);

    service.flushDataChanged();

    expect(emitted).toHaveLength(1);
    expect(emitted[0]!.event).toBe('data:changed');
    expect(emitted[0]!.payload.data).toEqual({ topics: ['checkin', 'led'], hallIds: [1, 2], sessionIds: [7] });
  });

  test('tự phát sau khoảng gom, không cần gọi flush', async () => {
    const { service, emitted } = createService();

    service.dataChanged('bachelor', { hallId: 3 });
    await sleep(DATA_CHANGE_COALESCE_MS + 80);

    expect(emitted).toHaveLength(1);
    expect(emitted[0]!.payload.data.topics).toEqual(['bachelor']);
  });

  test('thay đổi không nêu phạm vi (reset, import) thì phạm vi để rỗng nghĩa là mọi side và phiên', () => {
    const { service, emitted } = createService();

    service.dataChanged('checkin', { hallId: 1, sessionId: 7 });
    service.dataChanged('checkin');
    service.flushDataChanged();

    expect(emitted[0]!.payload.data).toMatchObject({ topics: ['checkin'], hallIds: [], sessionIds: [] });
  });

  test('sau khi phát thì bắt đầu gom lại từ đầu, và không phát khi chưa có thay đổi', () => {
    const { service, emitted } = createService();

    service.flushDataChanged();
    expect(emitted).toHaveLength(0);

    service.dataChanged('led', { hallId: 1, sessionId: 1 });
    service.flushDataChanged();
    service.dataChanged('bachelor', { hallId: 5, sessionId: 9 });
    service.flushDataChanged();

    expect(emitted.map((entry) => entry.payload.data.topics)).toEqual([['led'], ['bachelor']]);
    expect(emitted[1]!.payload.data.hallIds).toEqual([5]);
  });

  test('chưa gắn server thì không lỗi', () => {
    const service = new RealtimeService();
    service.dataChanged('checkin', { hallId: 1 });
    expect(() => service.flushDataChanged()).not.toThrow();
  });
});

describe('RealtimeService.disconnectUser', () => {
  test('ngắt mọi kết nối trong phòng của đúng tài khoản đó, không đụng tài khoản khác', () => {
    const calls: { room: string; close: unknown }[] = [];
    const service = new RealtimeService();
    service.attach({
      in: (room: string) => ({ disconnectSockets: (close: unknown) => calls.push({ room, close }) }),
    } as never);

    service.disconnectUser('u42');

    expect(calls).toEqual([{ room: 'user:u42', close: true }]);
  });

  test('chưa gắn server thì không lỗi', () => {
    expect(() => new RealtimeService().disconnectUser('u1')).not.toThrow();
  });
});
