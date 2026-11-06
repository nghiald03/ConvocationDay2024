import { describe, expect, test } from 'bun:test';
import { describeLateBanner, isFirstLateNext, isLateBachelor } from '../src/features/led/model/late-highlight';

const person = (attendanceStatus: number | null, fullName = 'Đỗ Trần Lâm') => ({ attendanceStatus, fullName });

describe('isLateBachelor', () => {
  test('chỉ attendanceStatus = 2 mới là đến trễ', () => {
    expect(isLateBachelor(person(2))).toBe(true);
    expect(isLateBachelor(person(1))).toBe(false);
    expect(isLateBachelor(person(3))).toBe(false);
    expect(isLateBachelor(person(null))).toBe(false);
    expect(isLateBachelor(null)).toBe(false);
    expect(isLateBachelor(undefined)).toBe(false);
  });
});

describe('describeLateBanner', () => {
  test('người đang chiếu đến trễ: một dòng "Đến trễ: Tên"', () => {
    expect(describeLateBanner(person(2))).toBe('Đến trễ: Đỗ Trần Lâm');
  });

  test('người đang chiếu đúng giờ hoặc chưa có ai thì không có dòng nào', () => {
    expect(describeLateBanner(person(1))).toBeNull();
    expect(describeLateBanner(null)).toBeNull();
  });
});

describe('isFirstLateNext', () => {
  test('người đang chiếu đúng giờ, người kế tiếp trễ: đây là người trễ đầu tiên', () => {
    expect(isFirstLateNext(person(1), person(2))).toBe(true);
    expect(isFirstLateNext(null, person(2))).toBe(true);
  });

  test('người đang chiếu đã là người trễ thì không đánh dấu người kế tiếp nữa', () => {
    expect(isFirstLateNext(person(2), person(2))).toBe(false);
  });

  test('người kế tiếp đúng giờ hoặc chưa có thì không đánh dấu', () => {
    expect(isFirstLateNext(person(1), person(1))).toBe(false);
    expect(isFirstLateNext(person(1), null)).toBe(false);
  });
});
