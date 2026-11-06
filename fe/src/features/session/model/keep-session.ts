/**
 * Đổi side thì giữ session đang chọn nếu side mới cũng có session đó, không thì bỏ chọn.
 * `sessions` là danh sách session của side mới; chưa tải xong (undefined) thì giữ nguyên để chờ.
 */
export function keepSessionIfAvailable(
  sessionId: string,
  sessions: { sessionId: number }[] | undefined,
): string {
  if (!sessionId || !sessions) return sessionId;
  return sessions.some((session) => String(session.sessionId) === sessionId) ? sessionId : '';
}
