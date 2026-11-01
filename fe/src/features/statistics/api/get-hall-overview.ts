import { isAxiosError } from 'axios';
import type { ApiResponse } from '@/lib/http/api-response';
import { httpClient } from '@/lib/http/client';
import type { HallOverview } from '../model/hall-overview';

export async function getHallOverview() {
  try {
    const response = await httpClient.get<ApiResponse<HallOverview[]>>(
      '/Statistics/hall-overview'
    );
    return response.data.data ?? [];
  } catch (error) {
    // The API answers 404 when there are no graduates yet.
    if (isAxiosError(error) && error.response?.status === 404) return [];
    throw error;
  }
}
