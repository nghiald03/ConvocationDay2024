import { queryOptions } from '@tanstack/react-query';
import { fallbackInterval } from '@/lib/realtime/realtime-status';
import { getLedQueue } from '../api/get-led-queue';

export const LED_QUEUE_REFRESH_MS = 5000;

export function ledQueueQueryOptions(hallId: number, sessionId: number | null) {
  return queryOptions({
    queryKey: ['led', 'queue', hallId, sessionId],
    queryFn: () => getLedQueue(hallId, sessionId!),
    enabled: sessionId !== null,
    // Websocket đang nối thì chờ tín hiệu `data:changed`; mất kết nối mới hỏi dự phòng.
    refetchInterval: fallbackInterval(LED_QUEUE_REFRESH_MS),
    refetchOnWindowFocus: true,
  });
}
