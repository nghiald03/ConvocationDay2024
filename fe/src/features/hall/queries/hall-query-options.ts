import { queryOptions } from '@tanstack/react-query';
import { getHalls } from '../api/get-halls';

export const hallQueryOptions = queryOptions({
  queryKey: ['hall', 'list'],
  queryFn: getHalls,
  staleTime: 5 * 60 * 1000,
});
