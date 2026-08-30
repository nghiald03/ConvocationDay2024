import { httpClient } from '@/lib/http/client';

export async function deleteBachelor(studentCode: string) {
  const response = await httpClient.delete(`/Bachelor/Delete/${studentCode}`);
  return response.data;
}
