import { httpClient } from '@/lib/http/client';

export async function createCheckIn(input: { hallId: number; sessionId: number }) {
  const response = await httpClient.post('/Checkin/CreateCheckin', input);
  return response.data;
}
