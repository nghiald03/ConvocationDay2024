import { queryOptions } from '@tanstack/react-query';
import { getCheckIns } from '../api/get-check-ins';

export const checkInKeys = {
  all: ['check-ins'] as const,
  list: () => [...checkInKeys.all, 'list'] as const,
};

export const checkInListQueryOptions = queryOptions({
  queryKey: checkInKeys.list(),
  queryFn: getCheckIns,
});
