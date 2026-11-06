'use client';

import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, LocateFixed, Play, RotateCcw } from 'lucide-react';
import swal from 'sweetalert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Hall } from '@/features/hall/model/hall';
import { getHttpErrorMessage } from '@/lib/http/get-http-error-message';
import toast from '@/lib/toast';
import { startLedQueue } from '../api/get-led-queue';
import { ATTENDANCE_LATE, countProgress, filterQueueItems } from '../model/led-queue';
import { ledQueueQueryOptions } from '../queries/led-queue-query-options';
import { formatTime, PROGRESS } from './queue-display';

/** Toàn bộ hàng đợi LED của một side trong một phiên, theo đúng thứ tự MC sẽ chiếu. */
export function LedQueuePanel({
  hall,
  sessionId,
  keyword,
  canStart = false,
}: {
  hall: Hall;
  sessionId: number;
  keyword: string;
  /** Chỉ Manager được bắt đầu chiếu; backend cũng chặn các vai trò khác. */
  canStart?: boolean;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery(ledQueueQueryOptions(hall.hallId, sessionId));
  const listRef = useRef<HTMLDivElement>(null);
  const items = filterQueueItems(data?.items ?? [], keyword);
  const counts = countProgress(data);
  const current = data?.currentIndex == null ? null : data.items[data.currentIndex];

  const started = data?.currentIndex != null;
  const start = useMutation({
    mutationFn: (restart: boolean) => startLedQueue(hall.hallId, sessionId, restart),
    onSuccess: () => {
      toast.success(`Đã bắt đầu chiếu ${hall.hallName}`, { duration: 4000, position: 'top-right' });
      queryClient.invalidateQueries({ queryKey: ['led', 'queue'] });
    },
    onError: (error: unknown) => {
      toast.error(getHttpErrorMessage(error, 'Không bắt đầu được'), { duration: 6000, position: 'top-right' });
      queryClient.invalidateQueries({ queryKey: ['led', 'queue'] });
    },
  });

  const handleStart = async () => {
    if (started) {
      // Bắt đầu lại làm LED nhảy về người đầu tiên giữa buổi lễ nên phải xác nhận.
      const confirmed = await swal({
        title: 'Bắt đầu lại?',
        text: `LED của ${hall.hallName} đang chiếu ${current?.chair ?? '-'} · ${current?.fullName ?? ''}. Bắt đầu lại sẽ quay về người đầu tiên của hàng đợi.`,
        icon: 'warning',
        buttons: ['Hủy', 'Bắt đầu lại'],
        dangerMode: true,
      });
      if (!confirmed) return;
    }
    start.mutate(started);
  };

  const scrollToCurrent = () =>
    listRef.current
      ?.querySelector('[data-current="true"]')
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });

  return (
    <Card>
      <CardContent className='space-y-3 p-4'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h2 className='text-lg font-semibold text-default-900'>{hall.hallName}</h2>
          <div className='flex flex-wrap gap-2'>
            {canStart && (
              <Button
                type='button'
                size='sm'
                color={started ? 'warning' : 'primary'}
                variant={started ? 'outline' : 'default'}
                onClick={() => void handleStart()}
                disabled={start.isPending || (!started && (data?.total ?? 0) === 0)}
                className='gap-1.5'
              >
                {started ? (
                  <RotateCcw className='h-4 w-4' aria-hidden='true' />
                ) : (
                  <Play className='h-4 w-4' aria-hidden='true' />
                )}
                {start.isPending ? 'Đang gửi…' : started ? 'Bắt đầu lại' : 'Bắt đầu'}
              </Button>
            )}
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={scrollToCurrent}
              disabled={!current}
              className='gap-1.5'
            >
              <LocateFixed className='h-4 w-4' aria-hidden='true' />
              Tới người đang chiếu
            </Button>
          </div>
        </div>

        <div className='flex flex-wrap gap-2'>
          <Badge color='secondary' variant='soft' className='normal-case tabular-nums'>
            Tổng: {data?.total ?? 0}
          </Badge>
          <Badge color='secondary' variant='soft' className='normal-case tabular-nums'>
            Đã chiếu: {counts.done}
          </Badge>
          <Badge color='warning' variant='soft' className='normal-case tabular-nums'>
            Còn lại: {counts.upcoming}
          </Badge>
          <Badge color='success' variant='soft' className='normal-case tabular-nums'>
            {current ? `Đang chiếu: ${current.chair ?? '-'} · ${current.fullName}` : 'Chưa bắt đầu chiếu'}
          </Badge>
        </div>

        {isError ? (
          <p className='flex items-center gap-2 text-sm text-destructive'>
            <AlertTriangle className='h-4 w-4' aria-hidden='true' />
            Không tải được hàng đợi, đang thử lại…
          </p>
        ) : isLoading ? (
          <p className='text-sm text-muted-foreground'>Đang tải…</p>
        ) : items.length === 0 ? (
          <p className='text-sm text-muted-foreground'>
            {keyword.trim() ? 'Không có ai khớp từ khóa.' : 'Chưa có ai check-in trong hàng đợi này.'}
          </p>
        ) : (
          <div ref={listRef} className='max-h-[65vh] overflow-auto rounded-md border'>
            <Table>
              <TableHeader className='sticky top-0 z-10 bg-card'>
                <TableRow>
                  <TableHead className='w-14'>#</TableHead>
                  <TableHead>Ghế</TableHead>
                  <TableHead>Họ tên</TableHead>
                  <TableHead>MSSV</TableHead>
                  <TableHead>Ghi chú</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.id}
                    data-current={item.progress === 'current'}
                    className={
                      item.progress === 'current'
                        ? 'bg-success/15'
                        : item.progress === 'done'
                          ? 'opacity-60'
                          : undefined
                    }
                  >
                    <TableCell className='tabular-nums'>{item.position}</TableCell>
                    <TableCell className='font-semibold tabular-nums'>{item.chair ?? '-'}</TableCell>
                    <TableCell className='font-medium'>{item.fullName}</TableCell>
                    <TableCell className='tabular-nums'>{item.studentCode}</TableCell>
                    <TableCell className='space-x-1'>
                      {item.isTail && (
                        <Badge color='warning' variant='soft' className='normal-case'>
                          Cuối phiên{item.originalChair ? ` · gốc ${item.originalChair}` : ''}
                        </Badge>
                      )}
                      {!item.isTail && item.attendanceStatus === ATTENDANCE_LATE && (
                        <Badge color='info' variant='soft' className='normal-case'>
                          Trễ · giữ ghế · {formatTime(item.timeCheckIn)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge color={PROGRESS[item.progress].color} variant='soft' className='normal-case'>
                        {PROGRESS[item.progress].label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
