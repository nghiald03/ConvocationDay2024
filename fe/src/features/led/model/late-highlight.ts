import type { Bachelor } from '@/features/bachelor/model/bachelor';
import { ATTENDANCE_LATE } from './led-queue';

type LateCandidate = Pick<Bachelor, 'attendanceStatus' | 'fullName'> | null | undefined;

/** Tân cử nhân check-in sau khi phiên đóng (attendanceStatus = 2), dù giữ ghế hay bị xếp xuống cuối. */
export function isLateBachelor(bachelor: LateCandidate): boolean {
  return bachelor?.attendanceStatus === ATTENDANCE_LATE;
}

/** Dòng trên cùng trang MC khi người đang chiếu đến trễ; null nếu không. */
export function describeLateBanner(current: LateCandidate): string | null {
  return isLateBachelor(current) ? `Đến trễ: ${current?.fullName ?? ''}` : null;
}

/**
 * Người kế tiếp là người đến trễ đầu tiên: người đang chiếu vẫn đúng giờ nên khung chưa vàng,
 * cần viền vàng ở thẻ "Tiếp theo" để MC biết sắp sang nhóm đến trễ.
 */
export function isFirstLateNext(current: LateCandidate, next: LateCandidate): boolean {
  return isLateBachelor(next) && !isLateBachelor(current);
}
