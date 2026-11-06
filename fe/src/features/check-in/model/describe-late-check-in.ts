import type { CheckInResult } from './check-in';

/** Nội dung thông báo khi check-in lúc phiên đã khóa: giữ ghế hoặc bị xếp xuống cuối phiên. */
export function describeLateCheckIn(result: CheckInResult) {
  const who = `Tân cử nhân ${result.fullName} (${result.studentCode}) đã check-in trễ.`;
  if (result.movedToEnd === false) {
    return {
      title: 'Phiên đã khóa: trễ nhưng giữ nguyên ghế',
      text: `${who} Ghế vẫn là ${result.chair ?? '-'}, LED còn cách xa nên không bị dời.`,
    };
  }
  const original = result.originalChair ? ` (ghế cũ ${result.originalChair})` : '';
  return {
    title: 'Phiên đã khóa: đã xếp xuống cuối phiên',
    text: `${who} Ghế mới: ${result.chair ?? '-'}${original}. Hãy cho bạn này xếp hàng sau người cuối cùng của side.`,
  };
}
