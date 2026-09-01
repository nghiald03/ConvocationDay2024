'use client';

import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, ListChecks, RotateCcw, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { getHttpErrorMessage } from '@/lib/http/get-http-error-message';
import {
  activatePhotoQueueKioskSession,
  confirmPhotoQueueCurrent,
  createPhotoQueueSession,
  coordinatorIssuePhotoQueueNumber,
  lookupPhotoQueueBachelor,
  movePhotoQueueNext,
  movePhotoQueuePrevious,
  setPhotoQueueNumber,
} from '../api/photo-queue-api';
import {
  photoQueueAuditLogsQueryOptions,
  photoQueuePublicStateQueryOptions,
  photoQueueStatsQueryOptions,
} from '../queries/photo-queue-query-options';
import { PhotoQueueAssignmentUpload } from './photo-queue-assignment-upload';
import { PhotoQueueSessionOnlySelector } from './photo-queue-session-only-selector';

export function PhotoQueueCoordinatorPage() {
  const [selection, setSelection] = useState({ photoSessionId: '', sessionLabel: '' });
  const [manualNumber, setManualNumber] = useState('');
  const [newSessionName, setNewSessionName] = useState('');
  const [lookupCode, setLookupCode] = useState('');
  const [issueReason, setIssueReason] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [retouchNoteImage1, setRetouchNoteImage1] = useState('');
  const [retouchNoteImage2, setRetouchNoteImage2] = useState('');
  const queryClient = useQueryClient();
  const enabled = Boolean(selection.photoSessionId);

  const state = useQuery(photoQueuePublicStateQueryOptions(selection.photoSessionId));
  const stats = useQuery(photoQueueStatsQueryOptions(selection.photoSessionId));
  const logs = useQuery(photoQueueAuditLogsQueryOptions(selection.photoSessionId));

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['photo-queue'] });
  }

  const next = useMutation({
    mutationFn: () => movePhotoQueueNext(selection.photoSessionId),
    onSuccess: () => {
      toast.success('Đã chuyển sang số tiếp theo.');
      invalidate();
    },
    onError: (error) => toast.error(getHttpErrorMessage(error, 'Không chuyển được số.')),
  });

  const confirmCurrent = useMutation({
    mutationFn: (photographed: boolean) =>
      confirmPhotoQueueCurrent({
        photoSessionId: selection.photoSessionId,
        photographed,
        retouchNoteImage1,
        retouchNoteImage2,
      }),
    onSuccess: () => {
      setConfirmOpen(false);
      setRetouchNoteImage1('');
      setRetouchNoteImage2('');
      toast.success('Đã ghi nhận xác nhận chụp ảnh.');
      invalidate();
    },
    onError: (error) =>
      toast.error(getHttpErrorMessage(error, 'Không xác nhận được tình trạng chụp.')),
  });

  const lookup = useMutation({
    mutationFn: lookupPhotoQueueBachelor,
    onSuccess: (data) => toast.success(`Đã tìm thấy ${data.fullName}.`),
    onError: (error) => toast.error(getHttpErrorMessage(error, 'Không tìm thấy tân cử nhân.')),
  });

  const coordinatorIssue = useMutation({
    mutationFn: () =>
      coordinatorIssuePhotoQueueNumber({
        studentCode: lookupCode,
        photoSessionId: selection.photoSessionId,
        reason: issueReason,
      }),
    onSuccess: () => {
      setLookupCode('');
      setIssueReason('');
      lookup.reset();
      toast.success('Đã cấp số mới tại bàn điều phối.');
      invalidate();
    },
    onError: (error) => toast.error(getHttpErrorMessage(error, 'Không cấp được số mới.')),
  });

  const previous = useMutation({
    mutationFn: () => movePhotoQueuePrevious(selection.photoSessionId),
    onSuccess: () => {
      toast.success('Đã quay lại số trước.');
      invalidate();
    },
    onError: (error) => toast.error(getHttpErrorMessage(error, 'Không quay lại được số.')),
  });

  const setNumber = useMutation({
    mutationFn: (queueNumber: number) => setPhotoQueueNumber(selection.photoSessionId, queueNumber),
    onSuccess: () => {
      setManualNumber('');
      toast.success('Đã chuyển đến số được nhập.');
      invalidate();
    },
    onError: (error) => toast.error(getHttpErrorMessage(error, 'Không chuyển được số.')),
  });

  const createSession = useMutation({
    mutationFn: () => createPhotoQueueSession(newSessionName),
    onSuccess: () => {
      setNewSessionName('');
      toast.success('Đã tạo phiên chụp ảnh.');
      void queryClient.invalidateQueries({ queryKey: ['photo-queue', 'sessions'] });
    },
    onError: (error) => toast.error(getHttpErrorMessage(error, 'Không tạo được phiên chụp ảnh.')),
  });

  const activateKiosk = useMutation({
    mutationFn: () => activatePhotoQueueKioskSession(selection.photoSessionId),
    onSuccess: () => {
      toast.success('Đã đưa phiên đang chọn lên kiosk/public.');
      invalidate();
    },
    onError: (error) => toast.error(getHttpErrorMessage(error, 'Không kích hoạt được phiên kiosk.')),
  });

  function submitManual(event: FormEvent) {
    event.preventDefault();
    const value = Number(manualNumber);
    if (Number.isInteger(value) && value >= 1) setNumber.mutate(value);
  }

  function submitNewSession(event: FormEvent) {
    event.preventDefault();
    if (newSessionName.trim()) createSession.mutate();
  }

  const retouchNotesReady = Boolean(retouchNoteImage1.trim() && retouchNoteImage2.trim());
  const hasCurrentNumber = Boolean(state.data?.currentNumber && state.data.currentNumber > 0);

  return (
    <main className='space-y-6'>
      <PhotoQueueSessionOnlySelector
        storageKey='photo-queue-coordinator'
        title='Điều phối số chụp ảnh'
        onChange={setSelection}
      />

      <form
        onSubmit={submitNewSession}
        className='flex flex-col gap-3 rounded-lg border bg-card p-4 text-card-foreground shadow-sm md:flex-row'
      >
        <Input
          value={newSessionName}
          onChange={(event) => setNewSessionName(event.target.value)}
          placeholder='Tên phiên chụp ảnh mới'
          aria-label='Tên phiên chụp ảnh mới'
        />
        <Button type='submit' variant='outline' disabled={createSession.isPending}>
          Tạo phiên
        </Button>
      </form>

      <Button
        type='button'
        variant='outline'
        disabled={!enabled || activateKiosk.isPending}
        onClick={() => activateKiosk.mutate()}
      >
        Đưa phiên đang chọn lên kiosk/public
      </Button>

      <PhotoQueueAssignmentUpload photoSessionId={selection.photoSessionId} />

      <section className='grid gap-6 lg:grid-cols-[420px_1fr]'>
        <div className='rounded-lg border bg-card p-6 text-card-foreground shadow-sm'>
          <p className='text-sm font-semibold text-muted-foreground'>Số hiện tại</p>
          <p className='mt-3 text-8xl font-black text-foreground'>
            {state.data?.currentNumber ?? 0}
          </p>
          <p className='mt-4 text-2xl font-bold'>
            {state.data?.current?.fullName ?? 'Chưa có người đang chụp'}
          </p>
          <div className='mt-6 grid grid-cols-2 gap-3'>
            <Button
              disabled={!enabled || previous.isPending}
              onClick={() => previous.mutate()}
              size='lg'
              variant='outline'
            >
              <ChevronLeft className='mr-2 h-5 w-5' />
              Quay lại
            </Button>
            <Button
              disabled={!enabled || next.isPending}
              onClick={() => {
                if (hasCurrentNumber) setConfirmOpen(true);
                else next.mutate();
              }}
              size='lg'
              variant='outline'
            >
              {hasCurrentNumber ? 'Next' : 'Bắt đầu'}
              <ChevronRight className='ml-2 h-5 w-5' />
            </Button>
          </div>
          <form onSubmit={submitManual} className='mt-4 flex gap-3'>
            <Input
              value={manualNumber}
              onChange={(event) => setManualNumber(event.target.value)}
              inputMode='numeric'
              placeholder='Nhập số bất kỳ'
              aria-label='Nhập số thứ tự bất kỳ'
            />
            <Button type='submit' variant='outline' disabled={!enabled || setNumber.isPending}>
              <RotateCcw className='mr-2 h-4 w-4' />
              Chuyển
            </Button>
          </form>
          <p className='mt-3 text-sm text-muted-foreground'>
            Sau khi nhảy số thủ công, lần bấm Next kế tiếp sẽ quay lại số trước đó + 1.
          </p>
        </div>

        <div className='rounded-lg border bg-card p-6 text-card-foreground shadow-sm'>
          <div className='flex items-center gap-2 text-xl font-bold'>
            <ListChecks className='h-5 w-5 text-foreground' />
            Thống kê
          </div>
          <div className='mt-5 grid gap-3 md:grid-cols-4'>
            <Metric label='Tổng đã bấm' value={stats.data?.summary.total ?? 0} />
            <Metric label='Đã chụp' value={stats.data?.summary.photographed ?? 0} />
            <Metric label='Chưa chụp' value={stats.data?.summary.waiting ?? 0} />
            <Metric label='Đã hủy' value={stats.data?.summary.canceled ?? 0} />
          </div>
          <div className='mt-6 max-h-[360px] overflow-auto rounded-lg border'>
            <table className='w-full text-left text-sm'>
              <thead className='bg-muted text-muted-foreground'>
                <tr>
                  <th className='p-3'>Số</th>
                  <th className='p-3'>MSSV</th>
                  <th className='p-3'>Họ tên</th>
                  <th className='p-3'>Tình trạng</th>
                </tr>
              </thead>
              <tbody>
                {(stats.data?.entries ?? []).map((entry) => (
                  <tr key={entry.queueNumber} className='border-t'>
                    <td className='p-3 font-bold'>{entry.queueNumber}</td>
                    <td className='p-3'>{entry.studentCode}</td>
                    <td className='p-3'>{entry.fullName}</td>
                    <td className='p-3'>
                      {getPhotoStatusLabel(entry.photoStatus)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className='rounded-lg border bg-card p-6 text-card-foreground shadow-sm'>
        <h2 className='text-xl font-bold'>Cấp số tại bàn điều phối</h2>
        <div className='mt-4 grid gap-3 md:grid-cols-[1fr_160px]'>
          <Input
            value={lookupCode}
            onChange={(event) => setLookupCode(event.target.value)}
            placeholder='Nhập MSSV cần chuyển phiên'
            aria-label='Nhập MSSV cần chuyển phiên'
          />
          <Button
            variant='outline'
            disabled={!lookupCode || lookup.isPending}
            onClick={() => lookup.mutate(lookupCode)}
          >
            <Search className='mr-2 h-4 w-4' />
            Kiểm tra
          </Button>
        </div>
        {lookup.data && (
          <div className='mt-4 rounded-lg border bg-background p-4'>
            <p className='text-lg font-bold'>{lookup.data.fullName}</p>
            <p className='text-sm text-muted-foreground'>
              {lookup.data.studentCode} - {lookup.data.major ?? 'Chưa có ngành'}
            </p>
            <p className='mt-2 text-sm text-muted-foreground'>
              Phiên chụp đang gán: {lookup.data.assignedPhotoSessionId ?? 'Chưa gán'}
              {lookup.data.requiresCoordinator ? ' - cần điều phối' : ''}
            </p>
            <div className='mt-4 grid gap-3 md:grid-cols-[1fr_180px]'>
              <Input
                value={issueReason}
                onChange={(event) => setIssueReason(event.target.value)}
                placeholder='Lý do chuyển phiên'
                aria-label='Lý do chuyển phiên'
              />
              <Button
                variant='outline'
                disabled={!enabled || !issueReason.trim() || coordinatorIssue.isPending}
                onClick={() => coordinatorIssue.mutate()}
              >
                Cấp số mới
              </Button>
            </div>
          </div>
        )}
      </section>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận tình trạng chụp ảnh</DialogTitle>
          </DialogHeader>
          <p className='text-sm text-muted-foreground'>
            Xác nhận số {state.data?.currentNumber ?? 0} đã chụp hay chưa trước khi chuyển sang
            số tiếp theo. Nếu đã chụp, nhập ghi chú ảnh 1 và ảnh 2 cho design retouch.
          </p>
          <div className='space-y-3'>
            <Input
              value={retouchNoteImage1}
              onChange={(event) => setRetouchNoteImage1(event.target.value)}
              placeholder='Ghi chú ảnh 1 cho design retouch'
              aria-label='Ghi chú ảnh 1 cho design retouch'
            />
            <Input
              value={retouchNoteImage2}
              onChange={(event) => setRetouchNoteImage2(event.target.value)}
              placeholder='Ghi chú ảnh 2 cho design retouch'
              aria-label='Ghi chú ảnh 2 cho design retouch'
            />
          </div>
          <DialogFooter className='grid grid-cols-1 gap-2 sm:grid-cols-2 sm:justify-stretch'>
            <Button
              variant='outline'
              className='w-full min-w-0 px-3'
              onClick={() => confirmCurrent.mutate(false)}
              disabled={confirmCurrent.isPending || !hasCurrentNumber}
            >
              Chưa chụp
            </Button>
            <Button
              variant='outline'
              className='w-full min-w-0 px-3'
              onClick={() => confirmCurrent.mutate(true)}
              disabled={confirmCurrent.isPending || !hasCurrentNumber || !retouchNotesReady}
            >
              Đã chụp
            </Button>
            <Button
              variant='outline'
              className='w-full min-w-0 px-3 sm:col-span-2'
              onClick={() => {
                confirmCurrent.mutate(true, { onSuccess: () => next.mutate() });
              }}
              disabled={confirmCurrent.isPending || next.isPending || !hasCurrentNumber || !retouchNotesReady}
            >
              Xác nhận và Next
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section className='rounded-lg border bg-card p-6 text-card-foreground shadow-sm'>
        <h2 className='text-xl font-bold'>Audit log</h2>
        <div className='mt-4 space-y-3'>
          {(logs.data ?? []).map((log) => (
            <div
              key={log.id}
              className='flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3'
            >
              <span className='font-semibold'>
                {log.action}: {log.previousNumber ?? '-'} → {log.nextNumber ?? '-'}
              </span>
              <span className='text-sm text-muted-foreground'>
                {log.actorName ?? 'Kiosk'} - {new Date(log.createdAt).toLocaleString('vi-VN')}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className='rounded-lg border bg-background p-4'>
      <p className='text-sm font-semibold text-muted-foreground'>{label}</p>
      <p className='mt-2 text-3xl font-black text-foreground'>{value}</p>
    </div>
  );
}

function getPhotoStatusLabel(status: 'WAITING' | 'PHOTOGRAPHED' | 'CANCELLED') {
  if (status === 'PHOTOGRAPHED') return 'Đã chụp';
  if (status === 'CANCELLED') return 'Đã hủy';
  return 'Chưa chụp';
}
