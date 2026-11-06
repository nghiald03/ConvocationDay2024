import type { ApiResponse } from '@/lib/http/api-response';
import { httpClient } from '@/lib/http/client';
import type { LedQueue } from '../model/led-queue';

export async function getLedQueue(hall: number, session: number) {
  const response = await httpClient.get<ApiResponse<LedQueue>>('/Mc/GetQueue', {
    params: { hall, session },
  });
  return response.data.data;
}

/** Manager bắt đầu chiếu: đặt người đang chiếu vào người đầu hàng đợi. `restart` để quay về người đầu khi LED đã bắt đầu. */
export async function startLedQueue(hall: number, session: number, restart = false) {
  const response = await httpClient.post<ApiResponse<unknown>>('/Mc/Start', { hall, session, restart });
  return response.data;
}

/** MC chuyển LED tới một người trong hàng đợi: về đầu hoặc theo MSSV. Chỉ khi LED đã bắt đầu. */
export async function jumpLedQueue(hall: number, session: number, target: 'first' | { studentCode: string }) {
  const body = target === 'first' ? { hall, session, toFirst: true } : { hall, session, studentCode: target.studentCode };
  const response = await httpClient.post<ApiResponse<unknown>>('/Mc/Jump', body);
  return response.data;
}
