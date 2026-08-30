import { httpClient } from '@/lib/http/client';

export const deleteAllBachelorsRequestConfig = {
  headers: { 'X-Confirm-Destructive': 'DELETE ALL BACHELORS' },
} as const;

export async function deleteAllBachelors() {
  const response = await httpClient.delete(
    '/Bachelor/DeleteAll',
    deleteAllBachelorsRequestConfig
  );
  return response.data;
}
