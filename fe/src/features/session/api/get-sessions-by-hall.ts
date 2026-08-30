import { httpClient } from '@/lib/http/client';
import type { HallSession } from '../model/session';

export async function getSessionsByHall(hallId: number) {
  const response = await httpClient.get<HallSession[]>(`/Checkin/by-hall/${hallId}`);
  return response.data;
}
