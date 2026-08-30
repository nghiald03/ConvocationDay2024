import { useQuery } from '@tanstack/react-query';
import type { BachelorListParams } from '../model/bachelor-page';
import { bachelorListQueryOptions } from './bachelor-query-options';

export function useBachelorListQuery(params: BachelorListParams) {
  return useQuery(bachelorListQueryOptions(params));
}
