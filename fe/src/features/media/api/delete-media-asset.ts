import { httpClient } from '@/lib/http/client';

export async function deleteMediaAsset(id: string) {
  const response = await httpClient.delete(`/media/${id}`);
  return response.data;
}
