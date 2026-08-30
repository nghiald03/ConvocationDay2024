import { queryOptions } from '@tanstack/react-query';
import { getMediaAssets } from '../api/get-media-assets';

export const mediaKeys = {
  all: ['media'] as const,
  list: () => [...mediaKeys.all, 'list'] as const,
};

export const mediaListQueryOptions = queryOptions({
  queryKey: mediaKeys.list(),
  queryFn: async () => {
    const assets = await getMediaAssets();
    return [...assets].sort(
      (first, second) => +new Date(second.createdAt) - +new Date(first.createdAt)
    );
  },
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  refetchInterval: 30_000,
});
