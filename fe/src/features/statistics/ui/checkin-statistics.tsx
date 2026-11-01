'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@iconify/react/dist/iconify.js';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { hallOverviewQueryOptions } from '@/features/statistics/queries/hall-overview-query-options';
import { cn } from '@/lib/utils';

type Counts = { total: number; checked: number };

const percent = ({ total, checked }: Counts) =>
  total === 0 ? 0 : Math.round((checked / total) * 1000) / 10;

const progressColor = (value: number) =>
  value >= 80 ? 'success' : value >= 40 ? 'warning' : 'destructive';

function SummaryCard({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: string | number;
  icon: string;
  className: string;
}) {
  return (
    <Card>
      <CardContent className='p-4 flex items-center gap-4'>
        <div className={cn('h-12 w-12 rounded-full grid place-content-center', className)}>
          <Icon icon={icon} className='h-6 w-6' />
        </div>
        <div>
          <div className='text-sm text-muted-foreground'>{label}</div>
          <div className='text-2xl font-semibold tabular-nums'>{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CheckinStatistics() {
  const { data: halls = [], isLoading, isError, dataUpdatedAt } = useQuery({
    ...hallOverviewQueryOptions,
    refetchInterval: 10000,
  });

  const { overall, rows } = useMemo(() => {
    const rows = halls.map((hall) => {
      const counts = hall.sessions.reduce<Counts>(
        (sum, s) => ({
          total: sum.total + s.totalStudents,
          checked: sum.checked + s.checkedInCount,
        }),
        { total: 0, checked: 0 }
      );
      return { ...hall, counts };
    });
    const overall = rows.reduce<Counts>(
      (sum, row) => ({
        total: sum.total + row.counts.total,
        checked: sum.checked + row.counts.checked,
      }),
      { total: 0, checked: 0 }
    );
    return { overall, rows };
  }, [halls]);

  if (isLoading) {
    return (
      <div className='space-y-3 pt-2'>
        <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-20' />
          ))}
        </div>
        <Skeleton className='h-64' />
      </div>
    );
  }

  if (isError) {
    return (
      <div className='p-6 text-center text-destructive'>
        Không thể tải thống kê checkin.
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className='p-6 text-center text-muted-foreground'>
        Chưa có dữ liệu tân cử nhân để thống kê.
      </div>
    );
  }

  const overallRate = percent(overall);

  return (
    <div className='space-y-4 pt-2'>
      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        <SummaryCard
          label='Tổng tân cử nhân'
          value={overall.total}
          icon='icon-park-solid:bachelor-cap-one'
          className='bg-primary/10 text-primary'
        />
        <SummaryCard
          label='Đã checkin'
          value={overall.checked}
          icon='mynaui:user-check'
          className='bg-success/10 text-success'
        />
        <SummaryCard
          label='Chưa checkin'
          value={overall.total - overall.checked}
          icon='mynaui:user-x'
          className='bg-destructive/10 text-destructive'
        />
        <SummaryCard
          label='Tỉ lệ checkin'
          value={`${overallRate}%`}
          icon='icon-park-outline:market-analysis'
          className='bg-info/10 text-info'
        />
      </div>

      <Card>
        <CardContent className='p-0'>
          <div className='flex items-center justify-between px-4 py-3 border-b'>
            <div className='font-medium'>Chi tiết theo hội trường / session</div>
            {dataUpdatedAt > 0 && (
              <div className='text-xs text-muted-foreground'>
                Cập nhật lúc {new Date(dataUpdatedAt).toLocaleTimeString('vi-VN')} · tự làm mới mỗi
                10 giây
              </div>
            )}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hội trường</TableHead>
                <TableHead>Session</TableHead>
                <TableHead className='text-right'>Tổng</TableHead>
                <TableHead className='text-right'>Đã checkin</TableHead>
                <TableHead className='text-right'>Chưa checkin</TableHead>
                <TableHead className='w-[260px]'>Tỉ lệ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((hall) => {
                const hallRate = percent(hall.counts);
                return [
                  <TableRow key={`hall-${hall.hallId}`} className='bg-default-50 font-medium'>
                    <TableCell>{hall.hallName}</TableCell>
                    <TableCell className='text-muted-foreground'>
                      {hall.totalSessions} session
                    </TableCell>
                    <TableCell className='text-right tabular-nums'>{hall.counts.total}</TableCell>
                    <TableCell className='text-right tabular-nums'>
                      {hall.counts.checked}
                    </TableCell>
                    <TableCell className='text-right tabular-nums'>
                      {hall.counts.total - hall.counts.checked}
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <Progress
                          value={hallRate}
                          color={progressColor(hallRate)}
                          size='sm'
                          className='flex-1'
                        />
                        <span className='w-12 text-right text-sm tabular-nums'>{hallRate}%</span>
                      </div>
                    </TableCell>
                  </TableRow>,
                  ...hall.sessions.map((s) => {
                    const rate = percent({ total: s.totalStudents, checked: s.checkedInCount });
                    return (
                      <TableRow key={`session-${hall.hallId}-${s.sessionId}`}>
                        <TableCell />
                        <TableCell>Session {s.sessionNumber}</TableCell>
                        <TableCell className='text-right tabular-nums'>{s.totalStudents}</TableCell>
                        <TableCell className='text-right tabular-nums'>
                          {s.checkedInCount}
                        </TableCell>
                        <TableCell className='text-right tabular-nums'>
                          {s.totalStudents - s.checkedInCount}
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-2'>
                            <Progress
                              value={rate}
                              color={progressColor(rate)}
                              size='sm'
                              className='flex-1'
                            />
                            <span className='w-12 text-right text-sm tabular-nums'>{rate}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }),
                ];
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
