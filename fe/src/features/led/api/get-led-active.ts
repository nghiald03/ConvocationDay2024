import type { ApiResponse } from '@/lib/http/api-response';
import { httpClient } from '@/lib/http/client';
import type { LedActiveSession } from '../model/led-progress';

/** Phiên đang chiếu LED của mỗi side; side chưa chiếu ai thì không có trong danh sách. */
export async function getLedActive() {
  const response = await httpClient.get<ApiResponse<LedActiveSession[]>>('/Mc/Active');
  return response.data.data ?? [];
}
