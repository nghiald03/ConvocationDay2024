import type { ApiResponse } from '@/lib/http/api-response';
import { httpClient } from '@/lib/http/client';
import type { Bachelor } from '../model/bachelor';

export async function getBachelorsByHallSession(hallId: number, sessionId: number) {
  const response = await httpClient.get<ApiResponse<Bachelor[]>>(
    `/Bachelor/GetByHallSession/${hallId}/${sessionId}`
  );
  return response.data.data ?? [];
}
