import { describe, expect, test } from 'bun:test';
import {
  formatElapsed,
  importElapsed,
  importPercent,
  importPhase,
  isImportFinished,
  type BachelorImportJob,
} from '../src/features/bachelor/model/bachelor-import';

const job = (extra: Partial<BachelorImportJob> = {}): BachelorImportJob => ({
  id: 'j1',
  status: 'running',
  total: 200,
  processed: 50,
  added: 48,
  failed: 2,
  errorMessages: [],
  errorsTruncated: false,
  message: null,
  startedAt: '2026-11-07T01:00:00.000Z',
  finishedAt: null,
  ...extra,
});

describe('importPercent', () => {
  test('tính theo số dòng đã xử lý', () => {
    expect(importPercent(job())).toBe(25);
    expect(importPercent(job({ processed: 199 }))).toBe(99);
  });

  test('chưa có tổng thì 0, hoàn tất thì luôn 100, không vượt 100', () => {
    expect(importPercent(job({ total: 0, processed: 0 }))).toBe(0);
    expect(importPercent(job({ status: 'completed', processed: 10 }))).toBe(100);
    expect(importPercent(job({ processed: 500 }))).toBe(100);
  });
});

describe('isImportFinished', () => {
  test('chỉ coi là xong khi hoàn tất hoặc thất bại', () => {
    expect(isImportFinished(job())).toBe(false);
    expect(isImportFinished(job({ status: 'completed' }))).toBe(true);
    expect(isImportFinished(job({ status: 'failed' }))).toBe(true);
    expect(isImportFinished(undefined)).toBe(false);
  });
});

describe('formatElapsed / importElapsed', () => {
  test('dưới một phút hiện giây, từ một phút hiện phút và giây', () => {
    expect(formatElapsed(45_000)).toBe('45 giây');
    expect(formatElapsed(125_000)).toBe('2 phút 05 giây');
    expect(formatElapsed(-5)).toBe('0 giây');
  });

  test('đang chạy tính đến bây giờ, đã xong tính đến lúc kết thúc', () => {
    const start = Date.parse('2026-11-07T01:00:00.000Z');
    expect(importElapsed(job(), start + 30_000)).toBe('30 giây');
    expect(importElapsed(job({ finishedAt: '2026-11-07T01:02:00.000Z' }), start + 999_999)).toBe('2 phút 00 giây');
  });
});

describe('importPhase', () => {
  test('mô tả bước đang làm', () => {
    expect(importPhase(job({ processed: 0 }))).toContain('kiểm tra');
    expect(importPhase(job())).toContain('ghi dữ liệu');
    expect(importPhase(job({ status: 'completed' }))).toBe('Đã xong');
    expect(importPhase(job({ status: 'failed' }))).toBe('Thất bại');
  });
});
