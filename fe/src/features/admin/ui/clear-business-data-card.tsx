'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { clearBusinessData, getBusinessData } from '@/features/admin/api/business-data';
import { getHttpErrorMessage } from '@/lib/http/get-http-error-message';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import toast from '@/lib/toast';

const tableLabels: Record<string, string> = {
  bachelor: 'Tân cử nhân',
  check_in: 'Side–phiên check-in',
  hall: 'Side',
  session: 'Phiên',
  notification: 'Thông báo',
  media_asset: 'Media (ảnh đã upload)',
  legacy_media_mapping: 'Liên kết media cũ',
  photo_queue_session: 'Photo queue: phiên',
  photo_queue_state: 'Photo queue: trạng thái',
  photo_queue_entry: 'Photo queue: số thứ tự',
  photo_queue_assignment: 'Photo queue: phân công',
  photo_queue_audit_log: 'Photo queue: nhật ký',
};

export default function ClearBusinessDataCard() {
  const queryClient = useQueryClient();
  const [typed, setTyped] = React.useState('');
  const summary = useQuery({ queryKey: ['admin', 'business-data'], queryFn: getBusinessData });
  const database = summary.data?.database ?? '';
  const totalRows = summary.data?.tables.reduce((sum, table) => sum + table.rows, 0) ?? 0;

  const clear = useMutation({
    mutationFn: () => clearBusinessData(`CLEAR ${database}`),
    onSuccess: (result) => {
      toast.success(result.message, { duration: 6000 });
      setTyped('');
      // Every cached list (halls, sessions, bachelors, …) is now stale.
      void queryClient.invalidateQueries();
    },
    onError: (error) => toast.error(getHttpErrorMessage(error, 'Xóa dữ liệu thất bại.')),
  });

  return (
    <Card className='border-destructive'>
      <CardHeader>
        <CardTitle className='text-destructive'>Xóa toàn bộ dữ liệu (giữ lại tài khoản)</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <p className='text-sm'>
          Xóa vĩnh viễn toàn bộ dữ liệu nghiệp vụ bên dưới. <strong>Giữ nguyên</strong> tài khoản người dùng, vai trò,
          phân quyền, nhật ký thao tác và thư viện ảnh đã upload (Media). Không thể hoàn tác — hãy xuất danh sách tân cử nhân ra Excel trước nếu cần.
        </p>

        <div className='grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2'>
          {summary.data?.tables.map((table) => (
            <div key={table.name} className='flex justify-between border-b border-dashed py-1'>
              <span>{tableLabels[table.name] ?? table.name}</span>
              <span className='font-mono'>{table.rows.toLocaleString()}</span>
            </div>
          ))}
          {summary.isLoading && <span className='text-muted-foreground'>Đang đếm dữ liệu…</span>}
          {summary.isError && (
            <span className='text-destructive'>{getHttpErrorMessage(summary.error, 'Không đọc được dữ liệu.')}</span>
          )}
        </div>

        {database && (
          <form
            className='space-y-2'
            onSubmit={(event) => {
              event.preventDefault();
              if (typed === database) clear.mutate();
            }}
          >
            <Label htmlFor='confirm-database'>
              Nhập tên database <code className='font-semibold'>{database}</code> để xác nhận
            </Label>
            <div className='flex flex-wrap gap-2'>
              <Input
                id='confirm-database'
                className='max-w-xs'
                autoComplete='off'
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
              />
              <Button type='submit' color='destructive' disabled={typed !== database || clear.isPending}>
                {clear.isPending ? 'Đang xóa…' : `Xóa ${totalRows.toLocaleString()} bản ghi`}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
