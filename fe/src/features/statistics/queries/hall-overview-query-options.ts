import { queryOptions } from '@tanstack/react-query';
import { getHallOverview } from '../api/get-hall-overview';

export const hallOverviewQueryOptions = queryOptions({
  queryKey: ['statistics', 'hall-overview'],
  queryFn: getHallOverview,
});
