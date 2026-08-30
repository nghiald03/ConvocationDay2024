import type { ApiResponse } from '@/lib/http/api-response';
import { httpClient } from '@/lib/http/client';
import type { BachelorListParams, BachelorPage } from '../model/bachelor-page';

export async function getBachelors(params: BachelorListParams) {
  const response = await httpClient.get<ApiResponse<BachelorPage>>(
    '/Bachelor/GetAll',
    {
      params: {
        pageIndex: params.pageIndex,
        pageSize: params.pageSize,
        keySearch: params.search || undefined,
        hallId: params.hall || undefined,
        sessionId: params.session || undefined,
      },
    }
  );

  return (
    response.data.data ?? {
      items: [],
      totalItems: 0,
      totalPages: 0,
      currentPage: params.pageIndex,
      pageSize: params.pageSize,
      hasPreviousPage: false,
      hasNextPage: false,
    }
  );
}
