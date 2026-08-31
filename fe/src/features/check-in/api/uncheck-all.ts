import { httpClient } from '@/lib/http/client';

export const uncheckAllRequestConfig = {
  headers: { 'X-Confirm-Destructive': 'UNCHECK ALL BACHELORS' },
} as const;

export async function uncheckAll() {
  const response = await httpClient.put(
    '/Checkin/UncheckAll',
    undefined,
    uncheckAllRequestConfig
  );
  return response.data;
}
