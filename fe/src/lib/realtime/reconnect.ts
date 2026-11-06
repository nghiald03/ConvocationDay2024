/** Chờ giữa các lần nối lại sau khi bị server ngắt: tăng dần để không dồn tải nếu server đang bận. */
export const RECONNECT_DELAYS_MS: readonly number[] = [1_000, 3_000, 10_000];

export type ReconnectOutcome = 'reconnected' | 'session-lost' | 'gave-up';

/**
 * Xử lý khi socket bị SERVER ngắt (socket.io không tự nối lại trong trường hợp này):
 * hỏi lại phiên trước, phiên còn hợp lệ mới nối lại. Phiên mất thì dừng, để lớp chặn đăng nhập đưa về trang đăng nhập.
 * Nối thất bại thì thử lại theo `delays`, hết lượt thì bỏ cuộc (trang tiếp tục dùng poll dự phòng).
 */
export async function reconnectAfterServerDisconnect({
  refreshSession,
  connect,
  wait,
  delays = RECONNECT_DELAYS_MS,
}: {
  /** Tải lại phiên; true nếu phiên còn hợp lệ. */
  refreshSession: () => Promise<boolean>;
  /** Nối lại websocket; true nếu nối được. */
  connect: () => Promise<boolean>;
  wait: (ms: number) => Promise<void>;
  delays?: readonly number[];
}): Promise<ReconnectOutcome> {
  for (const delay of delays) {
    await wait(delay);
    if (!(await refreshSession())) return 'session-lost';
    if (await connect()) return 'reconnected';
  }
  return 'gave-up';
}

/** Lý do ngắt mà socket.io KHÔNG tự nối lại: do server chủ động ngắt. */
export function isServerInitiatedDisconnect(reason: string): boolean {
  return reason === 'io server disconnect';
}

/** Mã lỗi bắt tay khi phiên không hợp lệ (backend trả trong `error.data.code`). */
export function isUnauthorizedConnectError(error: { data?: { code?: string } } | null | undefined): boolean {
  return error?.data?.code === 'auth/unauthorized';
}
