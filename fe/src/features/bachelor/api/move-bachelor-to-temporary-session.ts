import { httpClient } from '@/lib/http/client';

export async function moveBachelorToTemporarySession(
  studentCode: string,
  isMorning: boolean,
  /** Mã khẩn cấp; bắt buộc với nhân viên check-in, CL/MN không cần. */
  emergencyCode?: string
) {
  const response = await httpClient.put(
    `/Bachelor/UpdateBachelorToTempSession/${studentCode}`,
    { isMorning, emergencyCode }
  );
  return response.data;
}
