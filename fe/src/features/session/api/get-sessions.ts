import type { ApiResponse } from '@/lib/http/api-response';
import { httpClient } from '@/lib/http/client';
import type { Session } from '../model/session';

export async function getSessions() {
  const response = await httpClient.get<ApiResponse<Session[]>>('/Session/GetAll');
  return response.data.data ?? [];
}
