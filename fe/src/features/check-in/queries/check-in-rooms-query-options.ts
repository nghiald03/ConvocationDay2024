import { queryOptions } from '@tanstack/react-query';
import { getCheckInRooms } from '../api/get-check-in-rooms';

export const checkInRoomsQueryOptions = queryOptions({
  queryKey: ['check-in', 'rooms'],
  queryFn: getCheckInRooms,
});
