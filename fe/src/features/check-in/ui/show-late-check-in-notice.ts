import swal from 'sweetalert';
import type { CheckInResult } from '../model/check-in';

export function showLateCheckInNotice(result: CheckInResult) {
  return swal({
    title: 'Phiên đã khóa: đã xếp xuống cuối phiên',
    text: `Tân cử nhân ${result.fullName} (${result.studentCode}) đã check-in. Số ghế mới: ${result.chair ?? '-'}, ghế phụ huynh: ${result.chairParent ?? '-'}.`,
    icon: 'warning',
    buttons: ['Đã biết'],
  });
}
