import { httpClient } from '@/lib/http/client';

export async function uncheckAll() {
  const response = await httpClient.put('/Checkin/UncheckAll');
  return response.data;
}
