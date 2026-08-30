import { queryOptions } from '@tanstack/react-query';
import { getSessions } from '../api/get-sessions';
import { getSessionsByHall } from '../api/get-sessions-by-hall';

export const sessionQueryOptions = queryOptions({
  queryKey: ['session', 'list'],
  queryFn: getSessions,
  staleTime: 5 * 60 * 1000,
});

export function sessionsByHallQueryOptions(hallId: number | null) {
  return queryOptions({
    queryKey: ['session', 'by-hall', hallId],
    queryFn: () => getSessionsByHall(hallId!),
    enabled: hallId !== null,
    staleTime: 2 * 60 * 1000,
  });
}
