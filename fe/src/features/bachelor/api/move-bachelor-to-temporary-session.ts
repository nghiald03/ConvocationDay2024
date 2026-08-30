import { httpClient } from '@/lib/http/client';

export async function moveBachelorToTemporarySession(
  studentCode: string,
  isMorning: boolean
) {
  const response = await httpClient.put(
    `/Bachelor/UpdateBachelorToTempSession/${studentCode}`,
    { isMorning }
  );
  return response.data;
}
