import { describe, expect, test } from 'bun:test';
import type { CheckInPreview } from '../src/features/check-in/model/check-in';
import { describeCheckInPreview } from '../src/features/check-in/model/describe-check-in-preview';

const preview = (extra: Partial<CheckInPreview>): CheckInPreview => ({
  outcome: 'on-time',
  chair: 'D1',
  currentChair: 'A1',
  newChair: null,
  ...extra,
});

describe('describeCheckInPreview', () => {
  test('phiên đang mở: chỉ hỏi bình thường, không cảnh báo', () => {
    const dialog = describeCheckInPreview(preview({}), 'Lê Quốc Tín');

    expect(dialog.text).toBe('Bạn có muốn checkin cho tân cử nhân Lê Quốc Tín không?');
    expect(dialog).toMatchObject({ icon: 'info', danger: false });
  });

  test('trễ nhưng giữ ghế: nói nhẹ, nêu ghế giữ nguyên và LED, không đỏ', () => {
    const dialog = describeCheckInPreview(preview({ outcome: 'late-keep-seat' }), 'Lê Quốc Tín');

    expect(dialog.text).toContain('giữ nguyên ghế D1');
    expect(dialog.text).toContain('LED đang chiếu A1');
    expect(dialog.text).not.toContain('CẢNH BÁO');
    expect(dialog).toMatchObject({ icon: 'info', danger: false });
  });

  test('bị xếp xuống cuối: cảnh báo rõ, nêu ghế cũ → ghế mới và lý do', () => {
    const dialog = describeCheckInPreview(
      preview({ outcome: 'late-move-to-end', chair: 'C10', newChair: 'Z1' }),
      'Lê Quốc Tín',
    );

    expect(dialog.text).toContain('CẢNH BÁO');
    expect(dialog.text).toContain('ghế C10 → Z1');
    expect(dialog.text).toContain('LED đang chiếu A1');
    expect(dialog).toMatchObject({ icon: 'warning', danger: true });
  });

  test('LED chưa chiếu thì nói chưa chiếu', () => {
    const dialog = describeCheckInPreview(
      preview({ outcome: 'late-keep-seat', currentChair: null }),
      'Lê Quốc Tín',
    );

    expect(dialog.text).toContain('LED chưa chiếu');
  });

  test('không xem trước được: dùng cảnh báo thận trọng như trước', () => {
    const dialog = describeCheckInPreview(null, 'Lê Quốc Tín');

    expect(dialog.text).toContain('chưa kiểm tra được');
    expect(dialog).toMatchObject({ icon: 'warning', danger: true });
  });

  test('phiên chưa mở: báo có thể bị từ chối', () => {
    expect(describeCheckInPreview(preview({ outcome: 'not-open' }), 'A').text).toContain('chưa được mở');
  });
});
