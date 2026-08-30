import { httpClient } from '@/lib/http/client';
import type { MediaAsset } from '../model/media-asset';

export async function getMediaAssets() {
  const response = await httpClient.get<MediaAsset[]>('/media');
  return response.data;
}
