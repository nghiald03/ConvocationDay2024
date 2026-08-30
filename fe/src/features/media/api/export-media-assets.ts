import { httpClient } from '@/lib/http/client';

export async function exportMediaAssets() {
  const response = await httpClient.get<Blob>('/api/export-xlsx', {
    responseType: 'blob',
  });
  return response.data;
}
