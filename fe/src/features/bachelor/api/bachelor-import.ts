import type { ApiResponse } from '@/lib/http/api-response';
import { httpClient } from '@/lib/http/client';
import type { BachelorImportJob } from '../model/bachelor-import';
import type { Bachelor } from '../model/bachelor';

/** Bắt đầu import chạy nền; trả về ngay, tiến độ lấy qua `getBachelorImport`. */
export async function startBachelorImport(input: Bachelor[]) {
  const response = await httpClient.post<ApiResponse<BachelorImportJob>>('/Bachelor/Import', input);
  return response.data.data!;
}

export async function getBachelorImport(jobId: string) {
  const response = await httpClient.get<ApiResponse<BachelorImportJob>>(`/Bachelor/Import/${jobId}`);
  return response.data.data!;
}

/** Lần import mới nhất (đang chạy hoặc vừa xong); null nếu chưa có. */
export async function getLatestBachelorImport() {
  const response = await httpClient.get<ApiResponse<BachelorImportJob | null>>('/Bachelor/Import');
  return response.data.data ?? null;
}
