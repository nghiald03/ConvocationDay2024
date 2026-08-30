import { queryOptions } from '@tanstack/react-query';
import { getBachelors } from '../api/get-bachelors';
import type { BachelorListParams } from '../model/bachelor-page';

export const bachelorKeys = {
  all: ['bachelors'] as const,
  lists: () => [...bachelorKeys.all, 'list'] as const,
  list: (params: BachelorListParams) => [...bachelorKeys.lists(), params] as const,
};

export function bachelorListQueryOptions(params: BachelorListParams) {
  return queryOptions({
    queryKey: bachelorKeys.list(params),
    queryFn: () => getBachelors(params),
  });
}
