import { httpClient } from '@/lib/http/client';
import type { BulkDeleteMediaResult } from '../model/media-asset';

export async function deleteMediaAssets(ids: string[]) {
  const response = await httpClient.delete<BulkDeleteMediaResult>('/media', {
    data: { ids },
  });
  return response.data;
}
