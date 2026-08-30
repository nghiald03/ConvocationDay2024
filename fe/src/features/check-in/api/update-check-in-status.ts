import { httpClient } from '@/lib/http/client';
import type { CheckInStatusInput } from '../model/check-in';

export async function updateCheckInStatus(input: CheckInStatusInput) {
  const response = await httpClient.put('/Checkin/UpdateStatusCheckin', input);
  return response.data;
}
