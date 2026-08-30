import type { ApiResponse } from '@/lib/http/api-response';
import { httpClient } from '@/lib/http/client';
import type { Session } from '../model/session';

export async function createSession(input: {
  sessionNum: number;
  sessionInDay: number;
  description?: string;
}) {
  const response = await httpClient.post<ApiResponse<Session>>(
    '/Session/CreateSession',
    input
  );
  if (!response.data.data) throw new Error('Session response is missing data');
  return response.data.data;
}
