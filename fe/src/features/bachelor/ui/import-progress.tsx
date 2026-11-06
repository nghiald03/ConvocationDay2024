'use client';

import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  importElapsed,
  importPercent,
  importPhase,
  isImportFinished,
  type BachelorImportJob,
} from '../model/bachelor-import';

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className='rounded-md border p-2 text-center'>
      <div className='text-lg font-semibold tabular-nums'>{value}</div>
      <div className='text-xs text-muted-foreground'>{label}</div>
    </div>
  );
}

/** Tiến độ một lần import chạy nền: thanh phần trăm, số liệu và danh sách lỗi theo từng dòng. */
export function ImportProgress({ job }: { job: BachelorImportJob }) {
  const finished = isImportFinished(job);
  const percent = importPercent(job);
  const hasErrors = job.errorMessages.length > 0;

  return (
    <div className='space-y-4' aria-live='polite'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-2 font-medium'>
          {job.status === 'running' && <Loader2 className='h-4 w-4 animate-spin' aria-hidden='true' />}
          {job.status === 'completed' && <CheckCircle2 className='h-4 w-4 text-success' aria-hidden='true' />}
          {job.status === 'failed' && <AlertTriangle className='h-4 w-4 text-destructive' aria-hidden='true' />}
          {importPhase(job)}
        </div>
        <Badge
          color={job.status === 'failed' ? 'destructive' : job.status === 'completed' ? 'success' : 'info'}
          variant='soft'
          className='normal-case tabular-nums'
        >
          {percent}%
        </Badge>
      </div>

      <Progress
        value={percent}
        color={job.status === 'failed' ? 'destructive' : 'primary'}
        size='md'
        isStripe={!finished}
        isAnimate={!finished}
        aria-label='Tiến độ import'
      />

      <div className='grid grid-cols-2 gap-2 sm:grid-cols-5'>
        <Stat label='Tổng số dòng' value={job.total} />
        <Stat label='Đã xử lý' value={job.processed} />
        <Stat label='Thành công' value={job.added} />
        <Stat label='Lỗi' value={job.failed} />
        <Stat label='Thời gian' value={importElapsed(job)} />
      </div>

      {job.message && (
        <p className='flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
          <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0' aria-hidden='true' />
          {job.message}
        </p>
      )}

      {!finished && (
        <p className='text-sm text-muted-foreground'>
          Import chạy ở máy chủ, bạn có thể đóng cửa sổ này và quay lại xem tiếp.
        </p>
      )}

      {hasErrors && (
        <div className='space-y-1'>
          <h3 className='text-sm font-semibold'>
            Các dòng bị lỗi ({job.failed}
            {job.errorsTruncated ? `, chỉ hiện ${job.errorMessages.length} dòng đầu` : ''})
          </h3>
          <ul className='max-h-56 space-y-1 overflow-auto rounded-md border p-2 text-sm'>
            {job.errorMessages.map((message, index) => (
              <li key={`${index}-${message}`}>{message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
