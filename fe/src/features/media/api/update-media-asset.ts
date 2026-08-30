import { httpClient } from '@/lib/http/client';

export async function updateMediaAsset(input: { id: string; originalName: string }) {
  const response = await httpClient.patch(`/media/${input.id}`, {
    originalName: input.originalName,
  });
  return response.data;
}
