/**
 * Trạng thái websocket dùng chung toàn ứng dụng, để mỗi truy vấn tự quyết định có cần hỏi dự phòng hay không.
 * Là biến mô-đun (không phải state React) vì TanStack Query đọc `refetchInterval` ngoài vòng render.
 */
let connected = false;

export function setRealtimeConnected(value: boolean) {
  connected = value;
}

export function isRealtimeConnected() {
  return connected;
}

/**
 * Giá trị cho `refetchInterval` của TanStack Query: websocket đang nối thì KHÔNG hỏi (chờ tín hiệu `data:changed`),
 * mất kết nối thì hỏi dự phòng mỗi `ms` để màn hình vẫn cập nhật.
 * Hàm được tính lại sau mỗi lần tải; khi trạng thái đổi, `useDataSignals` tải lại các truy vấn đang mở để áp dụng.
 */
export function fallbackInterval(ms: number) {
  return (): number | false => (connected ? false : ms);
}
