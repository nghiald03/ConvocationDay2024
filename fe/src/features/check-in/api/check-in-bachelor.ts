import type { ApiResponse } from '@/lib/http/api-response';
import { httpClient } from '@/lib/http/client';
import type { CheckInBachelorInput, CheckInPreview, CheckInResult } from '../model/check-in';

export async function checkInBachelor(input: CheckInBachelorInput) {
  const response = await httpClient.put<ApiResponse<CheckInResult>>(
    '/Checkin/UpdateCheckin',
    input
  );
  return response.data.data;
}

export async function forceCheckInBachelor(input: { studentCode: string; emergencyCode: string }) {
  const response = await httpClient.put<ApiResponse<CheckInResult>>('/Checkin/ForceCheckin', input);
  return response.data.data;
}

export async function getCheckInPreview(studentCode: string) {
  const response = await httpClient.get<ApiResponse<CheckInPreview>>('/Checkin/Preview', {
    params: { studentCode },
  });
  return response.data.data ?? null;
}
