import { httpClient } from '@/lib/http/client';
import type { Bachelor } from '../model/bachelor';

export async function updateBachelor(input: Bachelor) {
  const response = await httpClient.put('/Bachelor/Update', input);
  return response.data;
}
