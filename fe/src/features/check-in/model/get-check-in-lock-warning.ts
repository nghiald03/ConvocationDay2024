type SessionLockState = {
  sessionNumber: number | null;
  status: boolean | null;
};

export const CHECK_IN_LOCKED_WARNING =
  'Cảnh báo: phiên đã khóa, tân cử nhân sẽ bị đổi ghế xuống cuối phiên.';

export const CHECK_IN_LOCK_UNKNOWN_WARNING =
  'Cảnh báo: chưa kiểm tra được trạng thái phiên. Nếu phiên đã khóa, tân cử nhân sẽ bị đổi ghế xuống cuối phiên.';

export function getCheckInLockWarning(
  sessions: SessionLockState[],
  sessionNumber: number
): string | null {
  const session = sessions.find((item) => item.sessionNumber === sessionNumber);
  if (!session) return CHECK_IN_LOCK_UNKNOWN_WARNING;
  return session.status === false ? CHECK_IN_LOCKED_WARNING : null;
}
