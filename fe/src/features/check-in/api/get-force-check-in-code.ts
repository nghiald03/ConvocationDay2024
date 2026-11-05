import type { ApiResponse } from '@/lib/http/api-response';
import { httpClient } from '@/lib/http/client';

export type ForceCheckInCode = {
  code: string;
  /** Thời gian còn lại theo đồng hồ server, tránh lệch giờ giữa các máy. */
  expiresInMs: number;
};

export async function getForceCheckInCode() {
  const response = await httpClient.get<ApiResponse<ForceCheckInCode>>('/Checkin/ForceCode');
  return response.data.data;
}
