import { describe, expect, test } from 'bun:test';
import { getPhotoQueueAuditDetails } from './photo-queue-audit-details.js';

describe('photo queue audit details', () => {
  test('describes who received which queue number at the kiosk', () => {
    expect(
      getPhotoQueueAuditDetails({
        type: 'number-issued',
        source: 'KIOSK',
        studentCode: 'SE170198',
        fullName: 'Lê Đại Nghĩa',
        queueNumber: 12,
      }),
    ).toBe('SE170198 Lê Đại Nghĩa đã lấy số 12 tại kiosk.');
  });

  test('describes who confirmed the photo status for whom', () => {
    expect(
      getPhotoQueueAuditDetails({
        type: 'photo-confirmed',
        actorName: 'Nguyễn Điều Phối',
        studentCode: 'SE170198',
        fullName: 'Lê Đại Nghĩa',
        photographed: false,
        notPhotographedReason: 'Vắng',
      }),
    ).toBe(
      'Nguyễn Điều Phối đã xác nhận SE170198 Lê Đại Nghĩa chưa chụp. Lý do: Vắng.',
    );
  });
});
