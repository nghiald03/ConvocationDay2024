import { describe, expect, test } from 'bun:test';
import {
  CHECK_IN_LOCK_UNKNOWN_WARNING,
  CHECK_IN_LOCKED_WARNING,
  getCheckInLockWarning,
} from '../src/features/check-in/model/get-check-in-lock-warning';

describe('getCheckInLockWarning', () => {
  const sessions = [
    { sessionNumber: 1, status: true },
    { sessionNumber: 2, status: false },
    { sessionNumber: 3, status: null },
  ];

  test('cảnh báo đổi ghế khi phiên đã khóa', () => {
    expect(getCheckInLockWarning(sessions, 2)).toBe(CHECK_IN_LOCKED_WARNING);
  });

  test('không cảnh báo khi phiên đang mở hoặc chưa mở', () => {
    expect(getCheckInLockWarning(sessions, 1)).toBeNull();
    expect(getCheckInLockWarning(sessions, 3)).toBeNull();
  });

  test('cảnh báo thận trọng khi không tìm thấy phiên', () => {
    expect(getCheckInLockWarning(sessions, 99)).toBe(
      CHECK_IN_LOCK_UNKNOWN_WARNING
    );
  });
});

describe('nội dung cảnh báo phiên đã khóa', () => {
  test('nói đúng luật: đi trễ, xuống cuối chỉ khi gần hàng LED, còn lại giữ ghế', () => {
    expect(CHECK_IN_LOCKED_WARNING).toContain('đi trễ');
    expect(CHECK_IN_LOCKED_WARNING).toContain('dưới 3 hàng');
    expect(CHECK_IN_LOCKED_WARNING).toContain('giữ nguyên ghế');
  });

  test('không còn khẳng định mọi người đều bị đổi ghế xuống cuối', () => {
    expect(CHECK_IN_LOCKED_WARNING).not.toContain('sẽ bị đổi ghế xuống cuối phiên');
    expect(CHECK_IN_LOCK_UNKNOWN_WARNING).not.toContain('sẽ bị đổi ghế xuống cuối phiên');
  });
});
