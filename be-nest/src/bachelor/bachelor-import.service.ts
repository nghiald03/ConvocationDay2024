import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { BachelorService, type ImportProgress } from './bachelor.service.js';
import type { BachelorDto } from './dto/bachelor.dto.js';

/** Số thông báo lỗi giữ lại cho mỗi lần import; vượt quá thì chỉ còn đếm. */
export const MAX_IMPORT_ERROR_MESSAGES = 500;
const MAX_KEPT_JOBS = 20;
const FINISHED_JOB_TTL_MS = 60 * 60 * 1000;

export type BachelorImportJob = {
  id: string;
  status: 'running' | 'completed' | 'failed';
  total: number;
  processed: number;
  added: number;
  failed: number;
  /** Lỗi theo từng dòng, tối đa MAX_IMPORT_ERROR_MESSAGES dòng đầu. */
  errorMessages: string[];
  errorsTruncated: boolean;
  /** Chỉ có khi cả lần import thất bại (không phải lỗi từng dòng). */
  message: string | null;
  startedAt: string;
  finishedAt: string | null;
};

/**
 * Import tân cử nhân chạy nền trong tiến trình này và cho xem tiến độ.
 * Trạng thái nằm trong bộ nhớ: khởi động lại backend thì mất tiến độ (dữ liệu đã ghi vẫn còn).
 */
@Injectable()
export class BachelorImportService {
  private readonly logger = new Logger(BachelorImportService.name);
  private readonly jobs = new Map<string, BachelorImportJob>();

  constructor(private readonly bachelors: BachelorService) {}

  /** Bắt đầu import và trả về ngay; từ chối nếu đang có một lần import khác chạy. */
  start(input: BachelorDto[]): BachelorImportJob {
    const running = this.latest();
    if (running?.status === 'running') {
      throw new ConflictException({
        code: 'bachelor/import-running',
        message: 'Đang có một lần import chạy, vui lòng chờ hoàn tất.',
        details: { jobId: running.id },
      });
    }
    this.prune();
    const job: BachelorImportJob = {
      id: randomUUID(),
      status: 'running',
      total: input.length,
      processed: 0,
      added: 0,
      failed: 0,
      errorMessages: [],
      errorsTruncated: false,
      message: null,
      startedAt: new Date().toISOString(),
      finishedAt: null,
    };
    this.jobs.set(job.id, job);
    void this.run(job, input);
    return this.snapshot(job);
  }

  get(id: string): BachelorImportJob {
    const job = this.jobs.get(id);
    if (!job) throw new NotFoundException('Không tìm thấy lần import này (có thể backend đã khởi động lại).');
    return this.snapshot(job);
  }

  /** Lần import mới nhất, để mở lại trang vẫn thấy tiến độ đang chạy. */
  latest(): BachelorImportJob | null {
    let newest: BachelorImportJob | null = null;
    for (const job of this.jobs.values()) {
      if (!newest || job.startedAt >= newest.startedAt) newest = job;
    }
    return newest ? this.snapshot(newest) : null;
  }

  private async run(job: BachelorImportJob, input: BachelorDto[]) {
    try {
      const errors = await this.bachelors.addMany(input, (progress: ImportProgress) => {
        job.total = progress.total;
        job.processed = progress.processed;
        job.added = progress.added;
        job.failed = progress.failed;
      });
      job.errorMessages = errors.slice(0, MAX_IMPORT_ERROR_MESSAGES);
      job.errorsTruncated = errors.length > MAX_IMPORT_ERROR_MESSAGES;
      job.failed = errors.length;
      job.processed = job.total;
      job.status = 'completed';
    } catch (error) {
      this.logger.error(`Import tân cử nhân thất bại: ${error instanceof Error ? error.message : String(error)}`);
      job.status = 'failed';
      job.message = 'Import thất bại do lỗi hệ thống. Dữ liệu đã ghi trước đó vẫn được giữ.';
    } finally {
      job.finishedAt = new Date().toISOString();
    }
  }

  private snapshot(job: BachelorImportJob): BachelorImportJob {
    return { ...job, errorMessages: [...job.errorMessages] };
  }

  private prune() {
    const now = Date.now();
    for (const [id, job] of this.jobs) {
      if (job.finishedAt && now - Date.parse(job.finishedAt) > FINISHED_JOB_TTL_MS) this.jobs.delete(id);
    }
    const finished = [...this.jobs.values()]
      .filter((job) => job.finishedAt)
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    for (const job of finished.slice(0, Math.max(0, finished.length - MAX_KEPT_JOBS))) this.jobs.delete(job.id);
  }
}
