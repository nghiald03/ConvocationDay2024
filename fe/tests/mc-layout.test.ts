import { describe, expect, test } from 'bun:test';
import {
  clampSplit,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  readStoredNumber,
  scaledRem,
  SPLIT_DEFAULT,
  SPLIT_MAX,
  SPLIT_MIN,
  splitFromPointer,
  stepFontScale,
} from '../src/features/led/model/mc-layout';

describe('stepFontScale', () => {
  test('tăng giảm từng bậc 0.1 và làm tròn, không bị sai số số thực', () => {
    expect(stepFontScale(1, 1)).toBe(1.1);
    expect(stepFontScale(1, -1)).toBe(0.9);
    expect(stepFontScale(1.1, 1)).toBe(1.2);
    expect(stepFontScale(0.8, 1)).toBe(0.9);
  });

  test('không vượt quá giới hạn nhỏ nhất và lớn nhất', () => {
    expect(stepFontScale(FONT_SCALE_MIN, -1)).toBe(FONT_SCALE_MIN);
    expect(stepFontScale(FONT_SCALE_MAX, 1)).toBe(FONT_SCALE_MAX);
  });
});

describe('scaledRem', () => {
  test('nhân cỡ chữ gốc với hệ số', () => {
    expect(scaledRem(1.5, 1)).toBe('1.5rem');
    expect(scaledRem(1.5, 1.2)).toBe('1.8rem');
    expect(scaledRem(0.8, 0.5)).toBe('0.4rem');
  });
});

describe('clampSplit / splitFromPointer', () => {
  test('giữ trong khoảng cho phép', () => {
    expect(clampSplit(10)).toBe(SPLIT_MIN);
    expect(clampSplit(90)).toBe(SPLIT_MAX);
    expect(clampSplit(40)).toBe(40);
  });

  test('tính tỉ lệ từ vị trí con trỏ trong khung', () => {
    expect(splitFromPointer(600, 0, 1200)).toBe(50);
    expect(splitFromPointer(500, 200, 1000)).toBe(30);
  });

  test('kéo ra ngoài khung thì bị chặn ở hai đầu, khung rỗng thì về mặc định', () => {
    expect(splitFromPointer(-50, 0, 1000)).toBe(SPLIT_MIN);
    expect(splitFromPointer(5000, 0, 1000)).toBe(SPLIT_MAX);
    expect(splitFromPointer(100, 0, 0)).toBe(SPLIT_DEFAULT);
  });
});

describe('readStoredNumber', () => {
  test('đọc số hợp lệ, còn lại dùng mặc định', () => {
    expect(readStoredNumber('1.2', 1, 0.7, 2)).toBe(1.2);
    expect(readStoredNumber(null, 1, 0.7, 2)).toBe(1);
    expect(readStoredNumber('abc', 1, 0.7, 2)).toBe(1);
    expect(readStoredNumber('5', 1, 0.7, 2)).toBe(1);
    expect(readStoredNumber('', 1, 0.7, 2)).toBe(1);
  });
});
