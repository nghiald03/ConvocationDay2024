import type { ApiResponse } from '@/lib/http/api-response';
import { httpClient } from '@/lib/http/client';
import type { Hall } from '../model/hall';

export async function getHalls() {
  const response = await httpClient.get<ApiResponse<Hall[]>>('/Hall/GetAll');
  return response.data.data ?? [];
}
