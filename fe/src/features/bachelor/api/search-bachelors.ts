import type { ApiResponse } from '@/lib/http/api-response';
import { httpClient } from '@/lib/http/client';
import type { BachelorPage } from '../model/bachelor-page';

export async function searchBachelors(search: string) {
  const response = await httpClient.get<ApiResponse<BachelorPage>>(
    '/Bachelor/search',
    { params: { keySearch: search, pageIndex: 1, pageSize: 1000 } }
  );
  if (!response.data.data) throw new Error('Bachelor search response is missing data');
  return response.data.data;
}
