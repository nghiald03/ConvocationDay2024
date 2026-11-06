import type { CheckInPreview } from './check-in';
import { CHECK_IN_LOCK_UNKNOWN_WARNING } from './get-check-in-lock-warning';

export type CheckInDialog = {
  text: string;
  icon: 'info' | 'warning';
  /** true khi nút xác nhận cần nổi bật màu nguy hiểm vì kết quả đáng chú ý. */
  danger: boolean;
};

/**
 * Nội dung popup xác nhận check-in, báo trước kết quả thật:
 * bình thường hoặc vẫn giữ ghế thì nói nhẹ, chỉ cảnh báo khi sẽ bị xếp xuống cuối phiên.
 * `preview` là null khi không xem trước được (lỗi mạng, không đủ quyền...).
 */
export function describeCheckInPreview(preview: CheckInPreview | null, fullName: string): CheckInDialog {
  const ask = `Bạn có muốn checkin cho tân cử nhân ${fullName} không?`;
  if (!preview) {
    return { text: `${ask}\n\n${CHECK_IN_LOCK_UNKNOWN_WARNING}`, icon: 'warning', danger: true };
  }
  const led = preview.currentChair ? `LED đang chiếu ${preview.currentChair}` : 'LED chưa chiếu';

  if (preview.outcome === 'late-keep-seat') {
    return {
      text: `${ask}\n\nPhiên đã khóa nên tính là đi trễ, nhưng tân cử nhân vẫn giữ nguyên ghế ${preview.chair ?? '-'} (${led}).`,
      icon: 'info',
      danger: false,
    };
  }
  if (preview.outcome === 'late-move-to-end') {
    const move = preview.newChair
      ? `ghế ${preview.chair ?? '-'} → ${preview.newChair}`
      : `ghế ${preview.chair ?? '-'} sẽ đổi`;
    return {
      text: `${ask}\n\nCẢNH BÁO: sẽ bị xếp xuống CUỐI PHIÊN (${move}). Phiên đã khóa và ghế này quá gần hàng LED đang chiếu (${led}), nên không giữ được chỗ.`,
      icon: 'warning',
      danger: true,
    };
  }
  if (preview.outcome === 'not-open') {
    return { text: `${ask}\n\nPhiên này chưa được mở nên check-in có thể bị từ chối.`, icon: 'info', danger: false };
  }
  return { text: ask, icon: 'info', danger: false };
}
