import { describe, expect, test } from 'bun:test';
import { decideLateSeat, isGridChair, KEEP_SEAT_MIN_ROW_GAP } from './late-seat-rule.js';

describe('decideLateSeat', () => {
  test('khoảng cách tối thiểu là 3 hàng', () => {
    expect(KEEP_SEAT_MIN_ROW_GAP).toBe(3);
  });

  test('LED ở hàng A: A, B, C bị đẩy cuối, D giữ ghế', () => {
    expect(decideLateSeat('A07', 'A02')).toBe('move-to-end');
    expect(decideLateSeat('B03', 'A02')).toBe('move-to-end');
    expect(decideLateSeat('C24', 'A02')).toBe('move-to-end');
    expect(decideLateSeat('D01', 'A02')).toBe('keep');
    expect(decideLateSeat('J24', 'A02')).toBe('keep');
  });

  test('LED ở hàng C: E bị đẩy, F giữ ghế', () => {
    expect(decideLateSeat('E10', 'C05')).toBe('move-to-end');
    expect(decideLateSeat('F01', 'C05')).toBe('keep');
  });

  test('hàng LED chỉ tính theo hàng, không theo số ghế', () => {
    expect(decideLateSeat('D01', 'A24')).toBe('keep');
    expect(decideLateSeat('D24', 'A01')).toBe('keep');
  });

  test('hàng đã qua thì bị đẩy cuối', () => {
    expect(decideLateSeat('B05', 'E01')).toBe('move-to-end');
    expect(decideLateSeat('E01', 'E01')).toBe('move-to-end');
  });

  test('LED chưa chiếu: tính như hàng A', () => {
    expect(decideLateSeat('C10', null)).toBe('move-to-end');
    expect(decideLateSeat('D10', null)).toBe('keep');
    expect(decideLateSeat('D10', undefined)).toBe('keep');
  });

  test('LED đang chiếu hàng Z (nhóm đến trễ): mọi người đều bị đẩy cuối', () => {
    expect(decideLateSeat('J24', 'Z01')).toBe('move-to-end');
    expect(decideLateSeat('J24', 'ZA25')).toBe('move-to-end');
  });

  test('ghế rỗng, sai định dạng hoặc đã ở ngoài lưới thì luôn bị đẩy cuối', () => {
    expect(decideLateSeat(null, 'A01')).toBe('move-to-end');
    expect(decideLateSeat('', 'A01')).toBe('move-to-end');
    expect(decideLateSeat('7', 'A01')).toBe('move-to-end');
    expect(decideLateSeat('Z02', null)).toBe('move-to-end');
    expect(decideLateSeat('ZA02', null)).toBe('move-to-end');
    expect(decideLateSeat('K05', null)).toBe('move-to-end');
  });

  test('không phân biệt hoa thường và số 0 đầu', () => {
    expect(decideLateSeat('d1', 'a01')).toBe('keep');
    expect(decideLateSeat('c1', 'A01')).toBe('move-to-end');
  });
});

describe('isGridChair', () => {
  test('chỉ ghế hàng A–J mới là ghế lưới', () => {
    expect(isGridChair('A01')).toBe(true);
    expect(isGridChair('j50')).toBe(true);
    expect(isGridChair('Z01')).toBe(false);
    expect(isGridChair('ZA25')).toBe(false);
    expect(isGridChair('7')).toBe(false);
    expect(isGridChair(null)).toBe(false);
  });
});
