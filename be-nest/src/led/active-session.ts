/** Một (side, phiên) đang có người `Current` trên LED. */
export type ActiveCandidate = {
  hallId: number;
  hallName: string;
  sessionId: number;
  sessionNumber: number | null;
  sessionInDay: number | null;
  description: string | null;
};

/**
 * Phiên đang chiếu của mỗi side. Phiên chiếu xong vẫn giữ người `Current` cuối cùng (LED chỉ xóa trạng thái trong
 * phiên đang thao tác), nên một side có thể có nhiều ứng viên. Ưu tiên phiên MC vừa thao tác (`lastMoved`, nhớ trong
 * bộ nhớ); không có (ví dụ server vừa khởi động lại) thì lấy phiên có số lớn nhất, vì các phiên chiếu theo thứ tự.
 */
export function pickActiveSessions(
  candidates: readonly ActiveCandidate[],
  lastMoved: ReadonlyMap<number, number>,
): ActiveCandidate[] {
  const byHall = new Map<number, ActiveCandidate>();
  for (const candidate of candidates) {
    const chosen = byHall.get(candidate.hallId);
    const remembered = lastMoved.get(candidate.hallId);
    if (!chosen) {
      byHall.set(candidate.hallId, candidate);
    } else if (chosen.sessionId === remembered) {
      continue;
    } else if (
      candidate.sessionId === remembered ||
      (candidate.sessionNumber ?? -1) > (chosen.sessionNumber ?? -1)
    ) {
      byHall.set(candidate.hallId, candidate);
    }
  }
  return [...byHall.values()].sort((a, b) => a.hallName.localeCompare(b.hallName));
}
