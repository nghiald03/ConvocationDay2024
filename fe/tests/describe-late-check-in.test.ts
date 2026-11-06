import { describe, expect, test } from 'bun:test';
import type { CheckInResult } from '../src/features/check-in/model/check-in';
import { describeLateCheckIn } from '../src/features/check-in/model/describe-late-check-in';

const base: CheckInResult = {
  studentCode: 'SV001',
  fullName: 'Nguyễn Văn A',
  chair: 'Z01',
  chairParent: 'PH5',
  late: true,
};

describe('describeLateCheckIn', () => {
  test('bị đẩy cuối: nêu ghế mới và ghế cũ', () => {
    const { title, text } = describeLateCheckIn({ ...base, movedToEnd: true, originalChair: 'C10' });

    expect(title).toContain('xuống cuối');
    expect(text).toContain('Z01');
    expect(text).toContain('ghế cũ C10');
  });

  test('bị đẩy cuối nhưng không có ghế cũ thì không in ghế cũ', () => {
    const { text } = describeLateCheckIn({ ...base, movedToEnd: true, originalChair: null });

    expect(text).not.toContain('ghế cũ');
  });

  test('server cũ chưa trả movedToEnd: coi như bị đẩy cuối như trước đây', () => {
    expect(describeLateCheckIn(base).title).toContain('xuống cuối');
  });

  test('trễ nhưng giữ ghế: nói rõ ghế không đổi', () => {
    const { title, text } = describeLateCheckIn({ ...base, chair: 'E03', movedToEnd: false });

    expect(title).toContain('giữ nguyên ghế');
    expect(text).toContain('E03');
    expect(text).not.toContain('ghế cũ');
  });
});
