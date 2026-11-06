/** Một lần import tân cử nhân chạy nền ở backend (`/Bachelor/Import`). */
export type BachelorImportJob = {
  id: string;
  status: 'running' | 'completed' | 'failed';
  total: number;
  /** Số dòng đã xử lý xong, dù thành công hay lỗi. */
  processed: number;
  added: number;
  failed: number;
  errorMessages: string[];
  /** true khi backend chỉ giữ lại một phần đầu của danh sách lỗi. */
  errorsTruncated: boolean;
  /** Có khi cả lần import thất bại vì lỗi hệ thống. */
  message: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export function isImportFinished(job: Pick<BachelorImportJob, 'status'> | null | undefined) {
  return job?.status === 'completed' || job?.status === 'failed';
}

/** Phần trăm hoàn thành, 0–100. */
export function importPercent(job: Pick<BachelorImportJob, 'total' | 'processed' | 'status'>) {
  if (job.status === 'completed') return 100;
  if (job.total <= 0) return 0;
  return Math.min(100, Math.floor((job.processed / job.total) * 100));
}

/** "45 giây" hoặc "2 phút 05 giây". */
export function formatElapsed(milliseconds: number) {
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  if (seconds < 60) return `${seconds} giây`;
  return `${Math.floor(seconds / 60)} phút ${String(seconds % 60).padStart(2, '0')} giây`;
}

export function importElapsed(job: Pick<BachelorImportJob, 'startedAt' | 'finishedAt'>, now = Date.now()) {
  const end = job.finishedAt ? Date.parse(job.finishedAt) : now;
  return formatElapsed(end - Date.parse(job.startedAt));
}

/** Mô tả bước đang làm; lúc chưa có dòng nào xử lý là bước tra trùng và chuẩn bị. */
export function importPhase(job: Pick<BachelorImportJob, 'status' | 'processed'>) {
  if (job.status === 'completed') return 'Đã xong';
  if (job.status === 'failed') return 'Thất bại';
  return job.processed === 0 ? 'Đang kiểm tra trùng và chuẩn bị…' : 'Đang ghi dữ liệu…';
}
