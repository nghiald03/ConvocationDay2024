import { describe, expect, test } from 'bun:test';
import { keepSessionIfAvailable } from '../src/features/session/model/keep-session';

const sessions = [{ sessionId: 7 }, { sessionId: 8 }];

describe('keepSessionIfAvailable', () => {
  test('side mới cũng có session đó thì giữ nguyên', () => {
    expect(keepSessionIfAvailable('7', sessions)).toBe('7');
  });

  test('side mới không có session đó thì bỏ chọn', () => {
    expect(keepSessionIfAvailable('9', sessions)).toBe('');
    expect(keepSessionIfAvailable('7', [])).toBe('');
  });

  test('danh sách chưa tải xong thì giữ nguyên để chờ, chưa có session thì vẫn rỗng', () => {
    expect(keepSessionIfAvailable('7', undefined)).toBe('7');
    expect(keepSessionIfAvailable('', sessions)).toBe('');
  });
});
