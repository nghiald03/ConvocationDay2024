import type { ApiResponse } from '@/lib/http/api-response';
import { httpClient } from '@/lib/http/client';

export type BachelorTransferResult = {
  studentCode: string;
  fullName: string;
  newSessionId: number;
  newSession: number;
  newSessionInDay: number | null;
  attendanceStatus: string;
  newChair: string;
  newChairParent: string;
};

export async function transferBachelorSession(input: {
  studentCode: string;
  newSessionId: number;
}) {
  const response = await httpClient.put<ApiResponse<BachelorTransferResult>>(
    '/Bachelor/TransferLateStudent',
    input
  );
  return response.data.data;
}
