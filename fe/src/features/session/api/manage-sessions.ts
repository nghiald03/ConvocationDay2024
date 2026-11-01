import type { ApiResponse } from '@/lib/http/api-response';
import { httpClient } from '@/lib/http/client';
import type { Session } from '../model/session';

export type SessionInput = {
  sessionNum: number;
  sessionInDay?: number;
  description?: string;
};

export async function updateSession(sessionId: number, input: SessionInput) {
  const response = await httpClient.put<ApiResponse<Session | null>>(
    `/Session/UpdateStatusSession/${sessionId}`,
    input
  );
  if (!response.data.data) throw new Error('Không tìm thấy phiên để cập nhật.');
  return response.data.data;
}

export async function deleteSession(sessionId: number) {
  const response = await httpClient.delete<ApiResponse<boolean>>(`/Session/DeleteSession/${sessionId}`);
  if (!response.data.data) {
    throw new Error('Xóa thất bại! Phiên vẫn còn tân cử nhân hoặc dữ liệu check-in.');
  }
}
