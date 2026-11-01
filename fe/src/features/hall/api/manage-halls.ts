import type { ApiResponse } from '@/lib/http/api-response';
import { httpClient } from '@/lib/http/client';
import type { Hall } from '../model/hall';

// The legacy Hall endpoints report some failures as HTTP 200 with a 4xx `status` in the body.
function assertOk<T>(body: ApiResponse<T>): ApiResponse<T> {
  if (body.status >= 400) throw new Error(body.message);
  return body;
}

export async function createHall(hallName: string) {
  const response = await httpClient.post<ApiResponse<Hall>>('/Hall/CreateHall', { hallName });
  return assertOk(response.data).data;
}

export async function updateHall(hallId: number, hallName: string) {
  const response = await httpClient.put<ApiResponse<boolean>>(`/Hall/UpdateHall/${hallId}`, { hallName });
  assertOk(response.data);
}

export async function deleteHall(hallId: number) {
  const response = await httpClient.delete<ApiResponse<boolean>>(`/Hall/DeleteHall/${hallId}`);
  assertOk(response.data);
}
