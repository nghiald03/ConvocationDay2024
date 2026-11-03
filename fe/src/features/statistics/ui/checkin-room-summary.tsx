'use client';

import { useQuery } from '@tanstack/react-query';
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
import type { ApiResponse } from '@/lib/http/api-response';
import { httpClient } from '@/lib/http/client';

type CheckinRoomSummaryRow = {
  room: string | null;
  totalStudents: number;
  checkedInCount: number;
  openSessionUncheckedCount: number;
};

async function getCheckinRoomSummary() {
  const response = await httpClient.get<ApiResponse<CheckinRoomSummaryRow[]>>(
    '/Statistics/checkin-room-summary'
  );
  return response.data.data ?? [];
}

const progressColor = (value: number) =>
  value >= 80 ? 'success' : value >= 40 ? 'warning' : 'destructive';

export default function CheckinRoomSummary() {
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ['statistics', 'checkin-room-summary'],
    queryFn: getCheckinRoomSummary,
    refetchInterval: 10000,
  });

  if (isLoading) return <Skeleton className='h-40' />;

  return (
    <Card>
      <CardContent className='p-0'>
        <div className='px-4 py-3 border-b font-medium'>Check-in theo phòng</div>
        {isError ? (
          <div className='p-6 text-center text-destructive'>
            Không thể tải thống kê theo phòng.
          </div>
        ) : !rows.length ? (
          <div className='p-6 text-center text-muted-foreground'>
            Chưa có dữ liệu tân cử nhân để thống kê.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phòng</TableHead>
                <TableHead className='text-right'>Tổng</TableHead>
                <TableHead className='text-right'>Đã checkin</TableHead>
                <TableHead className='text-right'>Chưa checkin</TableHead>
                <TableHead className='text-right'>Chưa checkin (phiên đang mở)</TableHead>
                <TableHead className='w-[260px]'>Tỉ lệ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const rate = row.totalStudents
                  ? Math.round((row.checkedInCount / row.totalStudents) * 1000) / 10
                  : 0;
                return (
                  <TableRow key={row.room ?? 'unassigned'}>
                    <TableCell className='font-medium'>
                      {row.room ?? (
                        <span className='text-muted-foreground'>Chưa xếp phòng</span>
                      )}
                    </TableCell>
                    <TableCell className='text-right tabular-nums'>{row.totalStudents}</TableCell>
                    <TableCell className='text-right tabular-nums'>{row.checkedInCount}</TableCell>
                    <TableCell className='text-right tabular-nums'>
                      {row.totalStudents - row.checkedInCount}
                    </TableCell>
                    <TableCell className='text-right tabular-nums'>
                      {row.openSessionUncheckedCount}
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
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
