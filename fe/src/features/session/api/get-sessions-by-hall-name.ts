import { httpClient } from '@/lib/http/client';
import type { HallSession } from '../model/session';

export async function getSessionsByHallName(hallName: string) {
  const response = await httpClient.get<HallSession[]>('/Checkin/by-hall-name', {
    params: { hallName },
  });
  return response.data;
}
