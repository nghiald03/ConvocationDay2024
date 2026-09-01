'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpDown, ChevronLeft, ChevronRight, ListChecks, RotateCcw, Search } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  getPhotoQueueStatsPage,
  getPreviousWaitingPhotoQueueNumber,
  type PhotoQueueStatsSortField,
} from '../model/photo-queue-stats-view';
import type { PhotoQueueAuditLog } from '../model/photo-queue';
import {
  photoQueueAuditLogsQueryOptions,
  photoQueuePublicStateQueryOptions,
  photoQueueStatsQueryOptions,
} from '../queries/photo-queue-query-options';
import { usePhotoQueueRealtime } from '../queries/use-photo-queue-realtime';
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
  const [notPhotographedReason, setNotPhotographedReason] = useState('Vắng');
  const [confirmSelection, setConfirmSelection] = useState<
    'photographed' | 'not-photographed' | null
  >(null);
  const [statsSearch, setStatsSearch] = useState('');
  const [statsSort, setStatsSort] = useState<{
    field: PhotoQueueStatsSortField;
    direction: 'asc' | 'desc';
  }>({ field: 'queueNumber', direction: 'asc' });
  const [statsPage, setStatsPage] = useState(1);
  const [statsPageSize, setStatsPageSize] = useState(10);
  const queryClient = useQueryClient();
  const enabled = Boolean(selection.photoSessionId);

  const realtime = usePhotoQueueRealtime(selection.photoSessionId);
  const fallbackRefetchInterval = realtime.isConnected ? false : 3000;
  const state = useQuery({
    ...photoQueuePublicStateQueryOptions(selection.photoSessionId),
    refetchInterval: fallbackRefetchInterval,
  });
  const stats = useQuery({
    ...photoQueueStatsQueryOptions(selection.photoSessionId),
    refetchInterval: fallbackRefetchInterval,
  });
  const logs = useQuery({
    ...photoQueueAuditLogsQueryOptions(selection.photoSessionId),
    refetchInterval: fallbackRefetchInterval,
  });

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
        notPhotographedReason,
      }),
    onSuccess: () => {
      setConfirmOpen(false);
      setRetouchNoteImage1('');
      setRetouchNoteImage2('');
      setNotPhotographedReason('Vắng');
      setConfirmSelection(null);
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
  const notPhotographedReasonReady = Boolean(notPhotographedReason.trim());
  const hasCurrentNumber = Boolean(state.data?.currentNumber && state.data.currentNumber > 0);
  const statsEntries = useMemo(() => stats.data?.entries ?? [], [stats.data?.entries]);
  const previousWaitingNumber = useMemo(
    () =>
      getPreviousWaitingPhotoQueueNumber(
        statsEntries,
        state.data?.currentNumber ?? 0,
      ),
    [state.data?.currentNumber, statsEntries],
  );
  const statsView = useMemo(
    () =>
      getPhotoQueueStatsPage(statsEntries, {
        search: statsSearch,
        sortField: statsSort.field,
        sortDirection: statsSort.direction,
        page: statsPage,
        pageSize: statsPageSize,
      }),
    [statsEntries, statsPage, statsPageSize, statsSearch, statsSort],
  );

  function changeStatsSort(field: PhotoQueueStatsSortField) {
    setStatsSort((current) => ({
      field,
      direction:
        current.field === field && current.direction === 'asc' ? 'desc' : 'asc',
    }));
    setStatsPage(1);
  }

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
          <div className='mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3'>
            <Button
              disabled={!enabled || previous.isPending || previousWaitingNumber === null}
              onClick={() => previous.mutate()}
              size='lg'
              variant='outline'
            >
              <ChevronLeft className='mr-2 h-5 w-5' />
              Quay lại
            </Button>
            <Button
              disabled={!enabled || !hasCurrentNumber || confirmCurrent.isPending}
              onClick={() => setConfirmOpen(true)}
              size='lg'
              variant='outline'
            >
              Xác nhận
            </Button>
            <Button
              disabled={
                !enabled ||
                next.isPending ||
                (hasCurrentNumber && !state.data?.currentPhotoConfirmed)
              }
              onClick={() => next.mutate()}
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
          <div className='mt-5 grid gap-3 md:grid-cols-5'>
            <Metric label='Tổng đã bấm' value={stats.data?.summary.total ?? 0} />
            <Metric label='Đã chụp' value={stats.data?.summary.photographed ?? 0} />
            <Metric label='Chưa chụp' value={stats.data?.summary.waiting ?? 0} />
            <Metric label='Vắng' value={stats.data?.summary.absent ?? 0} />
            <Metric label='Đã hủy' value={stats.data?.summary.canceled ?? 0} />
          </div>
          <div className='mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='relative flex-1'>
              <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                value={statsSearch}
                onChange={(event) => {
                  setStatsSearch(event.target.value);
                  setStatsPage(1);
                }}
                className='pl-9'
                placeholder='Tìm theo số, MSSV, họ tên, trạng thái'
                aria-label='Tìm kiếm bảng thống kê'
              />
            </div>
            <Select
              value={String(statsPageSize)}
              onValueChange={(value) => {
                setStatsPageSize(Number(value));
                setStatsPage(1);
              }}
            >
              <SelectTrigger className='w-full sm:w-[130px]' aria-label='Số dòng mỗi trang'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='10'>10 dòng</SelectItem>
                <SelectItem value='20'>20 dòng</SelectItem>
                <SelectItem value='50'>50 dòng</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='mt-6 max-h-[360px] overflow-auto rounded-lg border'>
            <table className='w-full text-left text-sm'>
              <thead className='bg-muted text-muted-foreground'>
                <tr>
                  <StatsSortHeader label='Số' field='queueNumber' onSort={changeStatsSort} />
                  <StatsSortHeader label='MSSV' field='studentCode' onSort={changeStatsSort} />
                  <StatsSortHeader label='Họ tên' field='fullName' onSort={changeStatsSort} />
                  <StatsSortHeader label='Tình trạng' field='photoStatus' onSort={changeStatsSort} />
                </tr>
              </thead>
              <tbody>
                {statsView.entries.map((entry) => (
                  <tr key={entry.queueNumber} className='border-t'>
                    <td className='p-3 font-bold'>{entry.queueNumber}</td>
                    <td className='p-3'>{entry.studentCode}</td>
                    <td className='p-3'>{entry.fullName}</td>
                    <td className='p-3'>
                      {getPhotoStatusLabel(entry.photoStatus)}
                    </td>
                  </tr>
                ))}
                {statsView.entries.length === 0 && (
                  <tr className='border-t'>
                    <td colSpan={4} className='p-6 text-center text-muted-foreground'>
                      Không tìm thấy dữ liệu phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className='mt-4 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between'>
            <p className='text-muted-foreground'>
              {statsView.totalEntries} kết quả · Trang {statsView.page}/{statsView.totalPages}
            </p>
            <div className='flex gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={statsView.page <= 1}
                onClick={() => setStatsPage(statsView.page - 1)}
              >
                <ChevronLeft className='mr-1 h-4 w-4' />
                Trước
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={statsView.page >= statsView.totalPages}
                onClick={() => setStatsPage(statsView.page + 1)}
              >
                Sau
                <ChevronRight className='ml-1 h-4 w-4' />
              </Button>
            </div>
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

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setConfirmSelection(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận tình trạng chụp ảnh</DialogTitle>
          </DialogHeader>
          {!confirmSelection ? (
            <div className='grid gap-3 sm:grid-cols-2'>
              <Button
                type='button'
                variant='outline'
                className='h-20 text-base'
                onClick={() => setConfirmSelection('not-photographed')}
              >
                Chưa chụp
              </Button>
              <Button
                type='button'
                variant='outline'
                className='h-20 text-base'
                onClick={() => setConfirmSelection('photographed')}
              >
                Đã chụp
              </Button>
            </div>
          ) : (
            <>
              <p className='text-sm text-muted-foreground'>
                {confirmSelection === 'photographed'
                  ? `Nhập đầy đủ ghi chú ảnh cho số ${state.data?.currentNumber ?? 0}.`
                  : `Nhập lý do số ${state.data?.currentNumber ?? 0} chưa chụp.`}
              </p>
              <div className='space-y-3'>
                {confirmSelection === 'photographed' ? (
                  <>
                    <Input
                      required
                      value={retouchNoteImage1}
                      onChange={(event) => setRetouchNoteImage1(event.target.value)}
                      placeholder='Ghi chú ảnh 1 cho design retouch'
                      aria-label='Ghi chú ảnh 1 cho design retouch'
                    />
                    <Input
                      required
                      value={retouchNoteImage2}
                      onChange={(event) => setRetouchNoteImage2(event.target.value)}
                      placeholder='Ghi chú ảnh 2 cho design retouch'
                      aria-label='Ghi chú ảnh 2 cho design retouch'
                    />
                  </>
                ) : (
                  <Input
                    required
                    value={notPhotographedReason}
                    onChange={(event) => setNotPhotographedReason(event.target.value)}
                    placeholder='Lý do chưa chụp'
                    aria-label='Lý do chưa chụp'
                  />
                )}
              </div>
              <DialogFooter className='grid grid-cols-1 gap-2 sm:grid-cols-2 sm:justify-stretch'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setConfirmSelection(null)}
                  disabled={confirmCurrent.isPending}
                >
                  Chọn lại
                </Button>
                <Button
                  type='button'
                  onClick={() =>
                    confirmCurrent.mutate(confirmSelection === 'photographed')
                  }
                  disabled={
                    confirmCurrent.isPending ||
                    !hasCurrentNumber ||
                    (confirmSelection === 'photographed'
                      ? !retouchNotesReady
                      : !notPhotographedReasonReady)
                  }
                >
                  Lưu xác nhận
                </Button>
              </DialogFooter>
            </>
          )}
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
              <span className='font-semibold'>{getAuditLogMessage(log)}</span>
              <span className='text-sm text-muted-foreground'>
                Thực hiện bởi {log.actorName ?? 'Hệ thống'} -{' '}
                {new Date(log.createdAt).toLocaleString('vi-VN')}
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

function StatsSortHeader({
  label,
  field,
  onSort,
}: {
  label: string;
  field: PhotoQueueStatsSortField;
  onSort: (field: PhotoQueueStatsSortField) => void;
}) {
  return (
    <th className='p-1'>
      <Button
        type='button'
        variant='ghost'
        size='sm'
        className='w-full justify-start px-2'
        onClick={() => onSort(field)}
      >
        {label}
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    </th>
  );
}

function getPhotoStatusLabel(status: 'WAITING' | 'PHOTOGRAPHED' | 'ABSENT' | 'CANCELLED') {
  if (status === 'PHOTOGRAPHED') return 'Đã chụp';
  if (status === 'ABSENT') return 'Vắng';
  if (status === 'CANCELLED') return 'Đã hủy';
  return 'Chưa chụp';
}

function getAuditLogFallback(log: PhotoQueueAuditLog) {
  if (log.action === 'next') return `Đã chuyển sang số ${log.nextNumber ?? '-'}.`;
  if (log.action === 'previous') return `Đã quay lại số ${log.nextNumber ?? '-'}.`;
  if (log.action === 'set') return `Đã chuyển thủ công sang số ${log.nextNumber ?? '-'}.`;
  if (log.action === 'confirm-photographed') return `Đã xác nhận số ${log.nextNumber ?? '-'} đã chụp.`;
  if (log.action === 'confirm-not-photographed') return `Đã xác nhận số ${log.nextNumber ?? '-'} chưa chụp.`;
  return `${log.action}: ${log.previousNumber ?? '-'} → ${log.nextNumber ?? '-'}`;
}

function getAuditLogMessage(log: PhotoQueueAuditLog) {
  if (log.details && log.details !== 'manual-jump') {
    if (log.action === 'student-request' && !log.details.includes('đã lấy số')) {
      return `${log.details} đã lấy số ${log.nextNumber ?? '-'} tại kiosk.`;
    }
    return log.details;
  }
  return getAuditLogFallback(log);
}
