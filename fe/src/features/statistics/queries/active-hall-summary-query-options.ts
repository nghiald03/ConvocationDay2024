import { queryOptions } from '@tanstack/react-query';
import { getActiveHallSummaries } from '../api/get-active-hall-summaries';

export const activeHallSummaryQueryOptions = queryOptions({
  queryKey: ['statistics', 'active-hall-summary'],
  queryFn: getActiveHallSummaries,
});
