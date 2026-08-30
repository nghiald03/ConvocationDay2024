import type { ApiResponse } from '@/lib/http/api-response';
import { httpClient } from '@/lib/http/client';
import type { CheckIn } from '../model/check-in';

export async function getCheckIns() {
  const response = await httpClient.get<ApiResponse<CheckIn[]>>(
    '/Checkin/GetAllStatusCheckin'
  );
  return response.data.data ?? [];
}
