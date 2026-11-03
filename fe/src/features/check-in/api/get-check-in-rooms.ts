import type { ApiResponse } from '@/lib/http/api-response';
import { httpClient } from '@/lib/http/client';
import type { CheckInRooms } from '../model/check-in-room';

export async function getCheckInRooms(): Promise<CheckInRooms> {
  const response = await httpClient.get<ApiResponse<CheckInRooms>>('/Checkin/rooms');
  return response.data.data ?? { rooms: [], assignedRooms: [] };
}
