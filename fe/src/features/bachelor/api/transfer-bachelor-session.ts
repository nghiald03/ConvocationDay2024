import type { ApiResponse } from '@/lib/http/api-response';
import { httpClient } from '@/lib/http/client';

export type TransferReason = 'late' | 'organizer';

export type BachelorTransferResult = {
  studentCode: string;
  fullName: string;
  newSessionId: number;
  newSession: number;
  newSessionInDay: number | null;
  reason: TransferReason;
  attendanceStatus: 'Late' | 'Unchanged';
  newHallId: number;
  newHall: string;
  newChair: string;
  newChairParent: string;
};

export async function transferBachelorSession(input: {
  studentCode: string;
  newSessionId: number;
  newHallId?: number;
  reason: TransferReason;
  /** Mã khẩn cấp; bắt buộc với nhân viên check-in, CL/MN không cần. */
  emergencyCode?: string;
}) {
  const response = await httpClient.put<ApiResponse<BachelorTransferResult>>(
    '/Bachelor/TransferLateStudent',
    input,
  );
  return response.data.data;
}
