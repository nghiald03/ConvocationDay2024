import swal from 'sweetalert';
import { describeLateCheckIn } from '../model/describe-late-check-in';
import type { CheckInResult } from '../model/check-in';

export function showLateCheckInNotice(result: CheckInResult) {
  const { title, text } = describeLateCheckIn(result);
  return swal({ title, text, icon: 'warning', buttons: ['Đã biết'] });
}
