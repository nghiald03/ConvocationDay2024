'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getAuditEvents, type AuditEvent } from '@/features/admin/api/audit-log';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import React from 'react';

const PAGE_SIZE = 50;

// Human-readable labels for the most common audited endpoints; anything else shows the raw path.
const actionLabels: [RegExp, string][] = [
  [/^PUT \/api\/Checkin\/UpdateCheckin(StudentCode)?$/, 'Check-in tân cử nhân'],
  [/^PUT \/api\/Checkin\/UncheckAll$/, 'Hủy toàn bộ check-in'],
  [/^PUT \/api\/Checkin\/UpdateStatusCheckin$/, 'Mở/đóng check-in hội trường'],
  [/^POST \/api\/Checkin\/CreateCheckin$/, 'Tạo hội trường–phiên check-in'],
  [/^POST \/api\/Bachelor\/Add$/, 'Thêm tân cử nhân'],
  [/^PUT \/api\/Bachelor\/(Update|UpdateListBachelor)/, 'Sửa tân cử nhân'],
  [/^PUT \/api\/Bachelor\/TransferLateStudent$/, 'Chuyển tân cử nhân đến muộn'],
  [/^POST \/api\/Hall\/CreateHall/, 'Tạo hội trường'],
  [/^PUT \/api\/Hall\/UpdateHall/, 'Sửa hội trường'],
  [/^DELETE \/api\/Hall\/DeleteHall/, 'Xóa hội trường'],
  [/^POST \/api\/Session\/CreateSession/, 'Tạo phiên'],
  [/^PUT \/api\/Session\/UpdateStatusSession/, 'Sửa phiên'],
  [/^DELETE \/api\/Session\/DeleteSession/, 'Xóa phiên'],
  [/^DELETE \/api\/Bachelor\/DeleteAll/, 'Xóa toàn bộ tân cử nhân'],
  [/^DELETE \/api\/Bachelor\/Delete\//, 'Xóa tân cử nhân'],
  [/^POST \/api\/Database\/clear-business-data/, 'XÓA TOÀN BỘ DỮ LIỆU NGHIỆP VỤ'],
  [/^POST \/api\/Database\/reset-database/, 'RESET DATABASE'],
  [/^POST \/api\/Users$/, 'Tạo tài khoản'],
  [/^PUT \/api\/Users\/[^/]+\/password$/, 'Đặt lại mật khẩu'],
  [/^PUT \/api\/Users\//, 'Sửa tài khoản'],
  [/^DELETE \/api\/Users\//, 'Xóa tài khoản'],
  [/^POST \/api\/Notification\/\d+\/(start-broadcast|broadcast)$/, 'Phát thông báo'],
  [/^POST \/api\/Notification\/\d+\/cancel$/, 'Hủy thông báo'],
  [/^POST \/api\/Notification$/, 'Tạo thông báo'],
  [/^DELETE \/api\/Notification\/\d+$/, 'Xóa thông báo'],
  [/^POST \/api\/auth\/logout$/, 'Đăng xuất'],
];

const loginFailureReasons: Record<string, string> = {
  unknown_user: 'Tài khoản không tồn tại',
  disabled: 'Tài khoản đã bị khóa',
  locked: 'Đang bị tạm khóa do nhập sai nhiều lần',
  invalid_password: 'Sai mật khẩu',
  password_reset_required: 'Cần đặt lại mật khẩu',
  error: 'Lỗi hệ thống',
};

function detail(event: AuditEvent, key: string) {
  const value = event.details?.[key];
  return typeof value === 'string' && value ? value : null;
}

function LoginAction({ event }: { event: AuditEvent }) {
  const success = event.action === 'LOGIN';
  const reason = detail(event, 'reason');
  const ip = detail(event, 'ip');
  const userAgent = detail(event, 'userAgent');
  return (
    <>
      <div className={success ? 'font-medium text-success' : 'font-medium text-destructive'}>
        {success ? 'Đăng nhập thành công' : 'Đăng nhập thất bại'}
        {!success && reason && (
          <span className='font-normal'> · {loginFailureReasons[reason] ?? reason}</span>
        )}
      </div>
      <div className='break-all text-xs text-muted-foreground'>
        IP: {ip ?? 'không rõ'}
        {userAgent && <span title={userAgent}> · {userAgent.slice(0, 80)}</span>}
      </div>
    </>
  );
}

function describe(event: AuditEvent) {
  return actionLabels.find(([pattern]) => pattern.test(event.action))?.[1] ?? null;
}

export default function AuditLogPage() {
  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState('');
  const [search, setSearch] = React.useState('');

  // Debounce typing so every keystroke does not hit the API.
  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['admin', 'audit', page, search],
    queryFn: () => getAuditEvents({ page, pageSize: PAGE_SIZE, q: search }),
    placeholderData: keepPreviousData,
  });

  const items = data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  return (
    <Card>
      <CardHeader className='flex flex-row flex-wrap items-center justify-between gap-3 space-y-0'>
        <CardTitle>Nhật ký thao tác (audit log)</CardTitle>
        <div className='flex flex-wrap gap-2'>
          <Input
            className='w-72'
            placeholder='Tìm theo người thao tác, đường dẫn hoặc LOGIN…'
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <Button variant='outline' onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? 'Đang tải…' : 'Làm mới'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className='space-y-3'>
        <p className='text-sm text-muted-foreground'>
          Ghi lại mọi thao tác thêm/sửa/xóa thành công và mọi lần đăng nhập (kể cả thất bại). Tổng cộng {data?.total ?? 0} bản ghi.
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-44'>Thời gian</TableHead>
              <TableHead className='w-56'>Người thao tác</TableHead>
              <TableHead>Thao tác</TableHead>
              <TableHead className='w-32'>Đối tượng</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((event) => {
              const label = describe(event);
              const isLogin = event.action === 'LOGIN' || event.action === 'LOGIN_FAILED';
              const path = typeof event.details?.path === 'string' ? event.details.path : event.action;
              return (
                <TableRow key={event.id}>
                  <TableCell className='whitespace-nowrap'>{new Date(event.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className='font-medium'>
                      {event.actorName ?? (event.actorId === 'anonymous' ? 'Không xác định' : 'Tài khoản đã xóa')}
                    </div>
                    <div className='text-xs text-muted-foreground'>
                      {event.actorEmail ?? (event.actorId === 'anonymous' ? event.targetId : event.actorId)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {isLogin ? (
                      <LoginAction event={event} />
                    ) : (
                      <>
                        {label && <div className='font-medium'>{label}</div>}
                        <code className='break-all text-xs text-muted-foreground'>
                          {event.action.split(' ')[0]} {path}
                        </code>
                      </>
                    )}
                  </TableCell>
                  <TableCell className='break-all text-xs'>{event.targetId || '—'}</TableCell>
                </TableRow>
              );
            })}
            {!items.length && (
              <TableRow>
                <TableCell colSpan={4} className='text-center text-muted-foreground'>
                  {isFetching ? 'Đang tải…' : 'Không có bản ghi nào.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className='flex items-center justify-end gap-2'>
          <Button variant='outline' size='sm' disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
            Trang trước
          </Button>
          <span className='text-sm'>
            Trang {page} / {pageCount}
          </span>
          <Button
            variant='outline'
            size='sm'
            disabled={page >= pageCount}
            onClick={() => setPage((value) => value + 1)}
          >
            Trang sau
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
