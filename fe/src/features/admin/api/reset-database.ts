import { httpClient } from '@/lib/http/client';

export async function resetDatabase(confirmation?: string) {
  const response = await httpClient.post(
    '/Database/reset-database',
    undefined,
    confirmation
      ? { headers: { 'X-Confirm-Destructive': confirmation } }
      : undefined
  );
  return response.data;
}
