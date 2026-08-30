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
import { createCheckIn } from '@/features/check-in/api/create-check-in';
import { getCheckIns } from '@/features/check-in/api/get-check-ins';
import { updateCheckInStatus } from '@/features/check-in/api/update-check-in-status';
import type { CheckIn } from '@/features/check-in/model/check-in';
import { createNotification } from '@/features/notification/api/create-notification';
import type { CreateNotificationRequest } from '@/features/notification/model/notification';
import { hallQueryOptions } from '@/features/hall/queries/hall-query-options';
import { getSessionsByHall } from '@/features/session/api/get-sessions-by-hall';
import { createSession } from '@/features/session/api/create-session';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import React from 'react';
import toast from 'react-hot-toast';
import swal from 'sweetalert';

/* =========================
   Types
========================= */
type Priority = 'high' | 'normal' | 'low';

type CheckinRow = CheckIn;

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

  // Dialog state + form
  const [openCreate, setOpenCreate] = React.useState(false);
  const [selectedHall, setSelectedHall] = React.useState<string>('');
  const [description, setDescription] = React.useState('');

  /* =========================
     Query: get list
  ========================= */
  const {
    data: rows = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['checkinList'],
    queryFn: getCheckIns,
  });

  // Halls list for select
  const { data: hallListRes } = useQuery(hallQueryOptions);

  /* =========================
     Mutation: create notification
  ========================= */
  const createNotificationMutation = useMutation({
    mutationFn: (request: CreateNotificationRequest) =>
      createNotification(request),
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
  // Mutation: create session
  const createSessionMutation = useMutation({
    mutationFn: (payload: {
      sessionNum: number;
      sessionInDay: number;
      description?: string;
    }) => createSession(payload),
  });

  // Mutation: create checkin
  const createCheckinMutation = useMutation({
    mutationFn: (payload: { hallId: number; sessionId: number }) =>
      createCheckIn(payload),
  });

  /* =========================
     Mutation: toggle checkin (optimistic)
  ========================= */
  const toggleMutation = useMutation({
    mutationFn: async (payload: {
      checkinId: CheckinRow['checkinId'];
      status: boolean;
    }) => {
      return updateCheckInStatus(payload);
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
          `Thay trạng thái checkin của hội trường ${item.hallName} session ${item.sessionInDay} thành công!`
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
            message: `Session ${row.sessionInDay} hội trường ${row.hallName} đã mở. Các bạn có thể bắt đầu check-in.`,
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

  // Handler: create session + create checkin
  const handleCreateSession = async () => {
    if (!selectedHall) {
      toast.error('Vui lòng chọn hội trường');
      return;
    }

    const hallIdNum = Number(selectedHall);

    try {
      // 1. fetch existing sessions for the hall
      const sessionsArray = await getSessionsByHall(hallIdNum);

      const maxSessionNum = sessionsArray.reduce((acc, cur) => {
        const v = Number(cur.sessionNumber ?? 0);
        return isNaN(v) ? acc : Math.max(acc, v);
      }, 0);

      const maxSessionInDay = sessionsArray.reduce((acc, cur) => {
        const v = Number(cur.sessionInDay ?? 0);
        return isNaN(v) ? acc : Math.max(acc, v);
      }, 0);

      const nextSessionNum = maxSessionNum + 1;
      const nextSessionInDay = maxSessionInDay + 1;

      // create session and use returned sessionId
      const createRes = await toast.promise(
        createSessionMutation.mutateAsync({
          sessionNum: nextSessionNum,
          sessionInDay: nextSessionInDay,
          description: description || `session bù cho hall ${selectedHall}`,
        }),
        {
          loading: 'Đang tạo session...',
          success: 'Tạo session thành công',
          error: 'Không thể tạo session',
        }
      );

      const sessionId = createRes.sessionId;

      if (!sessionId) {
        toast.error(
          'Không tìm thấy session vừa tạo (sessionId). Vui lòng kiểm tra server.'
        );
        setOpenCreate(false);
        return;
      }

      // create checkin record
      await toast.promise(
        createCheckinMutation.mutateAsync({ hallId: hallIdNum, sessionId }),
        {
          loading: 'Đang tạo checkin...',
          success: 'Tạo checkin thành công',
          error: 'Không thể tạo checkin',
        }
      );

      // Refresh checkin list
      queryClient.invalidateQueries({ queryKey: ['checkinList'] });

      toast.success('Tạo session + checkin thành công');
      setOpenCreate(false);
      setSelectedHall('');
      setDescription('');
    } catch (err) {
      // errors are handled by toast.promise above
    }
  };

  /* =========================
     Columns
  ========================= */
  const columns: ColumnDef<CheckinRow>[] = [
    { accessorKey: 'checkinId', header: 'ID' },
    { accessorKey: 'hallName', header: 'Hội trường' },
    { accessorKey: 'sessionNum', header: 'Session' },
    { accessorKey: 'sessionInDay', header: 'Session trong ngày' },
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
          <div className='flex items-center justify-between mb-4'>
            <h3 className='text-lg font-medium'>Danh sách session trao bằng</h3>
            <div className='flex items-center gap-2'>
              <Button color='primary' onClick={() => setOpenCreate(true)}>
                Tạo session mới
              </Button>
            </div>
          </div>
          <TableCustom title='' columns={columns} data={rows} />

          <Dialog open={openCreate} onOpenChange={(v) => setOpenCreate(v)}>
            <DialogContent className='sm:max-w-[520px]'>
              <DialogHeader>
                <DialogTitle>Tạo session mới</DialogTitle>
                <DialogDescription>
                  Tạo một session thay thế (session bù) cho hội trường.
                </DialogDescription>
              </DialogHeader>

              <div className='grid gap-4 py-4'>
                <div className='grid grid-cols-6 items-center gap-4 w-full'>
                  <Label className='text-right col-span-1'>Hội trường</Label>
                  <div className='col-span-5'>
                    <Select
                      value={selectedHall}
                      onValueChange={(v) => setSelectedHall(v)}
                    >
                      <SelectTrigger className='w-full h-11 border-2'>
                        <SelectValue placeholder='Chọn hội trường' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Hội trường</SelectLabel>
                          {(hallListRes || []).map((h) => (
                            <SelectItem key={h.hallId} value={String(h.hallId)}>
                              {h.hallName}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className='grid grid-cols-6 items-center gap-4 w-full'>
                  <Label className='text-right col-span-1'>Mô tả</Label>
                  <div className='col-span-5'>
                    <Input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder='Mô tả (ví dụ: session bù cho hall X)'
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant='outline' onClick={() => setOpenCreate(false)}>
                  Hủy
                </Button>
                <Button
                  color='primary'
                  onClick={handleCreateSession}
                  disabled={
                    createSessionMutation.isPending ||
                    createCheckinMutation.isPending
                  }
                >
                  Tạo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </>
  );
}
