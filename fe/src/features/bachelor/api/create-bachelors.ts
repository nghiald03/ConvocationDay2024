import { httpClient } from '@/lib/http/client';
import type { Bachelor } from '../model/bachelor';

export async function createBachelors(input: Bachelor[]) {
  const response = await httpClient.post('/Bachelor/Add', input);
  return response.data;
}
