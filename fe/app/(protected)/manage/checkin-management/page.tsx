'use client';
import TableCustom from '@/components/table/table';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  manageAPI,
  notificationAPI,
  type CreateNotificationRequest,
} from '@/config/axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import React from 'react';
import toast from 'react-hot-toast';
import swal from 'sweetalert';

/* =========================
   Types
========================= */
type Priority = 'high' | 'normal' | 'low';

export type CheckinRow = {
  checkinId: string | number;
  hallName: string;
  sessionNum: number;
  status: boolean;
};

type CheckinListResponse = {
  data: {
    data: CheckinRow[];
  };
};

/* =========================
   Mapper
========================= */
function mapLocalToApi(local: {
  message: string;
  priority: Priority | undefined;
  repeatCount?: number;
}): CreateNotificationRequest {
  return {
    title: 'Thông báo hội trường',
    content: local.message,
    priority: local.priority === 'high' ? 1 : local.priority === 'low' ? 3 : 2,
    isAutomatic: false,
    repeatCount: local.repeatCount || 1,
  };
}

export default function CheckinPage() {
  const queryClient = useQueryClient();

  /* =========================
     Query: get list
  ========================= */
  const {
    data: rows = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<CheckinRow[]>({
    queryKey: ['checkinList'],
    queryFn: async () => {
      const res = (await manageAPI.getCheckinList()) as CheckinListResponse;
      return res.data.data;
    },
  });

  /* =========================
     Mutation: create notification
  ========================= */
  const createNotificationMutation = useMutation({
    mutationFn: (request: CreateNotificationRequest) =>
      notificationAPI.create(request),
    onSuccess: () => {
      toast.success('Đã gửi thông báo mở session');
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ||
          'Không thể gửi thông báo. Vui lòng thử lại.'
      );
    },
  });

  /* =========================
     Mutation: toggle checkin (optimistic)
  ========================= */
  const toggleMutation = useMutation({
    mutationFn: async (payload: {
      checkinId: CheckinRow['checkinId'];
      status: boolean;
    }) => {
      return manageAPI.updateStatusCheckin(payload);
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['checkinList'] });
      const prev = queryClient.getQueryData<CheckinRow[]>(['checkinList']);

      // Optimistic update
      if (prev) {
        queryClient.setQueryData<CheckinRow[]>(
          ['checkinList'],
          prev.map((r) =>
            r.checkinId === vars.checkinId ? { ...r, status: vars.status } : r
          )
        );
      }

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      // Rollback
      if (ctx?.prev) {
        queryClient.setQueryData(['checkinList'], ctx.prev);
      }
      toast.error('Cập nhật trạng thái thất bại.');
    },
    onSuccess: (_data, vars) => {
      // Refresh to be exact with server
      queryClient.invalidateQueries({ queryKey: ['checkinList'] });
      const item = rows.find((r) => r.checkinId === vars.checkinId);
      if (item) {
        toast.success(
          `Thay trạng thái checkin của hội trường ${item.hallName} session ${item.sessionNum} thành công!`
        );
      }
    },
  });

  /* =========================
     Handlers
  ========================= */
  const handleToggle = async (row: CheckinRow, nextChecked: boolean) => {
    // Confirm (sweetalert v1: icon hợp lệ: 'warning' | 'success' | 'error' | 'info')
    const confirm = await swal({
      title: 'Thay đổi trạng thái checkin',
      text: `Bạn có muốn thay đổi trạng thái checkin của hội trường ${row.hallName} session ${row.sessionNum} không?`,
      icon: 'warning',
      buttons: ['Không', 'Thay đổi'],
      dangerMode: true,
    });

    if (!confirm) return;

    // toast.promise cho call update
    try {
      await toast.promise(
        toggleMutation.mutateAsync({
          checkinId: row.checkinId,
          status: nextChecked,
        }),
        {
          loading: 'Đang thay đổi trạng thái...',
          success: 'Cập nhật trạng thái thành công!',
          error: 'Không thể thay đổi trạng thái!',
        },
        { position: 'top-right', duration: 3000 }
      );

      // Nếu mở session (true) -> hỏi gửi thông báo
      if (nextChecked) {
        const send = await swal({
          title: 'Thông báo mở session',
          text: 'Bạn có muốn gửi thông báo rằng session đã mở không?',
          icon: 'info',
          buttons: ['Không', 'Có, gửi thông báo'],
        });

        if (send) {
          const request = mapLocalToApi({
            message: `Session ${row.sessionNum} hội trường ${row.hallName} đã mở. Các bạn có thể bắt đầu check-in.`,
            priority: 'high',
            repeatCount: 2,
          });
          createNotificationMutation.mutate(request);
        }
      }
    } catch {
      // lỗi đã được toast.promise xử lý
    }
  };

  /* =========================
     Columns
  ========================= */
  const columns: ColumnDef<CheckinRow>[] = [
    { accessorKey: 'checkinId', header: 'ID' },
    { accessorKey: 'hallName', header: 'Hội trường' },
    { accessorKey: 'sessionNum', header: 'Session' },
    {
      accessorKey: 'status',
      header: 'Action',
      cell: ({ row }) => {
        const original = row.original;
        const checked = Boolean(row.getValue('status'));
        const pending = toggleMutation.isPending;

        return (
          <Switch
            checked={checked}
            disabled={pending}
            // shadcn Switch nên dùng onCheckedChange thay vì onClick
            onCheckedChange={(next) => handleToggle(original, next)}
          />
        );
      },
    },
  ];

  /* =========================
     Render
  ========================= */
  return (
    <>
      <Card>
        <CardContent className='p-3'>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href='/'>Trang chủ</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Quản lí</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Quản lí checkin</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </CardContent>
      </Card>

      <Card className='mt-3'>
        <CardContent className='p-3'>
          <TableCustom
            title='Danh sách session trao bằng'
            data={rows}
            columns={columns}
          />
        </CardContent>
      </Card>
    </>
  );
}
