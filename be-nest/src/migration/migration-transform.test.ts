import { describe, expect, test } from 'bun:test';
import {
  booleanValue,
  dateValue,
  deterministicId,
  legacyVietnamDateValue,
  numberValue,
  parseJsonDetails,
  textValue,
  validEmail,
} from './migration-transform.js';

describe('chuẩn hóa dữ liệu migration', () => {
  test('ID sinh ra ổn định và đúng định dạng UUID', () => {
    const first = deterministicId('user', 'legacy-1');
    expect(first).toBe(deterministicId('user', 'legacy-1'));
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  test('chuyển đổi kiểu rõ ràng, không âm thầm ép dữ liệu lỗi', () => {
    const row = { Name: '  Hội trường A ', Number: '12', Enabled: 1, Date: '2026-08-31T00:00:00Z' };
    expect(textValue(row, 'Name', true)).toBe('Hội trường A');
    expect(numberValue(row, 'Number', true)).toBe(12);
    expect(booleanValue(row, 'Enabled')).toBe(true);
    expect(dateValue(row, 'Date')?.toISOString()).toBe('2026-08-31T00:00:00.000Z');
    expect(legacyVietnamDateValue(row, 'Date')?.toISOString()).toBe('2026-08-30T17:00:00.000Z');
    expect(() => numberValue({ Number: 'mười hai' }, 'Number', true)).toThrow();
  });

  test('kiểm tra email và giữ chi tiết audit legacy', () => {
    expect(validEmail('user@example.com')).toBe(true);
    expect(validEmail('email-sai')).toBe(false);
    expect(parseJsonDetails('{"reason":"test"}')).toEqual({ reason: 'test' });
    expect(parseJsonDetails('nội dung cũ')).toEqual({ legacyText: 'nội dung cũ' });
  });
});
