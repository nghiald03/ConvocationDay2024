import type { ApiResponse } from '@/lib/http/api-response';
import { httpClient } from '@/lib/http/client';
import type { ActiveHallSummary } from '../model/active-hall-summary';

export async function getActiveHallSummaries() {
  const response = await httpClient.get<ApiResponse<ActiveHallSummary[]>>(
    '/Statistics/active-halls-summary'
  );
  return response.data.data ?? [];
}
