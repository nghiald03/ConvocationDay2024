import { httpClient } from '@/lib/http/client';

export async function deleteAllBachelors() {
  const response = await httpClient.delete('/Bachelor/DeleteAll', {
    headers: { 'X-Confirm-Destructive': 'DELETE ALL BACHELORS' },
  });
  return response.data;
}
