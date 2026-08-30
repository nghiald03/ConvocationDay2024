import { useQuery } from '@tanstack/react-query';
import { checkInListQueryOptions } from './check-in-query-options';

export function useCheckInListQuery() {
  return useQuery(checkInListQueryOptions);
}
