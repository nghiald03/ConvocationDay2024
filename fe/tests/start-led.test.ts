import { describe, expect, test } from 'bun:test';
import { AxiosError } from 'axios';
import { classifyStartError, describeStartOutcomes } from '../src/features/led/model/start-led';

const httpError = (status: number) =>
  new AxiosError('lỗi', 'ERR_BAD_REQUEST', undefined, undefined, { status } as never);

describe('classifyStartError', () => {
  test('409 là LED đã bắt đầu, 400 là hàng đợi trống, còn lại là lỗi', () => {
    expect(classifyStartError(httpError(409))).toBe('already-started');
    expect(classifyStartError(httpError(400))).toBe('empty-queue');
    expect(classifyStartError(httpError(500))).toBe('failed');
    expect(classifyStartError(new Error('mạng'))).toBe('failed');
  });
});

describe('describeStartOutcomes', () => {
  test('mọi side đã chạy thì ok, liệt kê từng side', () => {
    const summary = describeStartOutcomes([
      { hallName: 'Right', outcome: 'started' },
      { hallName: 'Left', outcome: 'already-started' },
    ]);

    expect(summary.ok).toBe(true);
    expect(summary.message).toBe('Right: đã bắt đầu\nLeft: đã bắt đầu từ trước, giữ nguyên');
  });

  test('có side trống hoặc lỗi thì không ok và nói rõ side nào', () => {
    const summary = describeStartOutcomes([
      { hallName: 'Right', outcome: 'started' },
      { hallName: 'Left', outcome: 'empty-queue' },
    ]);

    expect(summary.ok).toBe(false);
    expect(summary.message).toContain('Left: chưa có ai check-in');
  });

  test('không có side nào thì không ok', () => {
    expect(describeStartOutcomes([]).ok).toBe(false);
  });
});
