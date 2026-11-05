import { describe, expect, test } from 'bun:test';
import { canViewForceCode, formatCountdown } from '../src/features/check-in/model/force-code';

describe('force code', () => {
  test('chỉ CL và MN thấy mã', () => {
    expect(canViewForceCode(['CL'])).toBe(true);
    expect(canViewForceCode(['mn'])).toBe(true);
    expect(canViewForceCode(['CK', 'CL'])).toBe(true);
    expect(canViewForceCode(['CK'])).toBe(false);
    expect(canViewForceCode(['MC', 'NO'])).toBe(false);
    expect(canViewForceCode(undefined)).toBe(false);
  });

  test('đếm ngược dạng phút:giây', () => {
    expect(formatCountdown(300_000)).toBe('5:00');
    expect(formatCountdown(61_001)).toBe('1:02');
    expect(formatCountdown(9_000)).toBe('0:09');
    expect(formatCountdown(-5)).toBe('0:00');
  });
});
