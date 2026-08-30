import { httpClient } from '@/lib/http/client';
import type { CheckInBachelorInput } from '../model/check-in';

export async function checkInBachelor(input: CheckInBachelorInput) {
  const response = await httpClient.put('/Checkin/UpdateCheckin', input);
  return response.data;
}
