type SessionLockState = {
  sessionNumber: number | null;
  status: boolean | null;
};

export const CHECK_IN_LOCKED_WARNING =
  'Cảnh báo: phiên đã khóa nên tân cử nhân được tính là đi trễ. Nếu hàng ghế này cách hàng LED đang chiếu dưới 3 hàng thì bị xếp xuống cuối phiên, còn lại vẫn giữ nguyên ghế.';

export const CHECK_IN_LOCK_UNKNOWN_WARNING =
  'Cảnh báo: chưa kiểm tra được trạng thái phiên. Nếu phiên đã khóa, tân cử nhân được tính là đi trễ và có thể bị xếp xuống cuối phiên.';

export function getCheckInLockWarning(
  sessions: SessionLockState[],
  sessionNumber: number
): string | null {
  const session = sessions.find((item) => item.sessionNumber === sessionNumber);
  if (!session) return CHECK_IN_LOCK_UNKNOWN_WARNING;
  return session.status === false ? CHECK_IN_LOCKED_WARNING : null;
}
