'use client';
import { checkinAPI, notificationAPI, type CreateNotificationRequest } from '@/config/axios';
import { Bachelor } from '@/dtos/BachelorDTO';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import toast from 'react-hot-toast';

export default function UncheckedInTable({
  hallId,
  sessionId,
}: {
  hallId: number;
  sessionId: number;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['bachelors-by-session', hallId, sessionId],
    queryFn: () => checkinAPI.getByHallSession(hallId, sessionId),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  const extractList = (raw: any): any[] => {
    if (!raw) return [];
    const d = raw.data;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.data)) return d.data;
    if (Array.isArray(d?.items)) return d.items;
    if (Array.isArray(d?.data?.items)) return d.data.items;
    return [];
  };

  const all: Bachelor[] = extractList(data) as Bachelor[];
  const list = all.filter((b) => !b?.checkIn);

  // Replicate ManualCheckinPage's notification behavior
  const sendNotifyMutation = useMutation({
    mutationFn: async (payload: { message: string }) => {
      const req: CreateNotificationRequest = {
        title: 'Thông báo hội trường',
        content: payload.message,
        // priority: 2 => normal
        priority: 2,
        isAutomatic: false,
        repeatCount: 1,
      };
      return notificationAPI.create(req);
    },
    onSuccess: (res) => {
      toast.success(res?.data?.message ?? 'Đã gửi thông báo!', {
        duration: 3000,
        position: 'top-right',
      });
    },
    onError: (err: any) => {
      toast.error(
        'Gửi thông báo thất bại: ' +
          (err?.response?.data?.message || err?.message || 'Lỗi không xác định'),
        { duration: 4000, position: 'top-right' }
      );
    },
  });

  const handleSendNotify = (row: Bachelor) => {
    const hallLabel = row.hallName != null && row.hallName !== '' ? row.hallName : 'hội trường';
    const message = `Xin mời Tân cử nhân ${row.fullName} với mã số sinh viên ${row.studentCode} tới hội trường ${hallLabel} thuộc phiên ${row.sessionNum} để làm thủ tục checkin trước khi cổng checkin đóng lại.`;
    sendNotifyMutation.mutate({ message });
  };

  return (
    <div className='mt-2 border rounded-md'>
      <div className='px-3 py-2 border-b text-sm font-medium'>
        Danh sách chưa checkin
      </div>
      {isLoading && (
        <div className='p-3 space-y-2'>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className='h-6 w-full' />
          ))}
        </div>
      )}
      {!isLoading && isError && (
        <div className='p-3 text-sm text-red-600'>Không thể tải danh sách.</div>
      )}
      {!isLoading && !isError && list.length === 0 && (
        <div className='p-3 text-sm text-muted-foreground'>
          Tất cả đã checkin.
        </div>
      )}
      {!isLoading && !isError && list.length > 0 && (
        <div className='max-h-72 overflow-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã SV</TableHead>
                <TableHead>Họ tên</TableHead>
                <TableHead>Ngành</TableHead>
                <TableHead>Ghế</TableHead>
                <TableHead>Ghế phụ huynh</TableHead>
                <TableHead>Thông báo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((b) => (
                <TableRow key={b.studentCode}>
                  <TableCell className='whitespace-nowrap'>
                    {b.studentCode}
                  </TableCell>
                  <TableCell>{b.fullName}</TableCell>
                  <TableCell className='whitespace-nowrap'>{b.major}</TableCell>
                  <TableCell className='whitespace-nowrap'>{b.chair}</TableCell>
                  <TableCell className='whitespace-nowrap'>
                    {b.chairParent}
                  </TableCell>
                  <TableCell className='whitespace-nowrap'>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => handleSendNotify(b)}
                      disabled={sendNotifyMutation.isPending}
                    >
                      {sendNotifyMutation.isPending ? 'Đang gửi...' : 'Gửi thông báo'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
