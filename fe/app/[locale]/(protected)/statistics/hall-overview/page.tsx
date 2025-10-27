'use client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  statisticsAPI,
  type ActiveHallSummary,
  type HallOverview,
  notificationAPI,
  type CreateNotificationRequest,
  checkinAPI,
} from '@/config/axios';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import UncheckedInTable from '@/components/statistics/uncheckedInTable';
import { Button } from '@/components/ui/button';
import {
  Bell,
  Users,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function HallOverviewPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['active-halls-summary'],
    queryFn: () => statisticsAPI.getActiveHallsSummary(),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  const halls: ActiveHallSummary[] = data?.data?.data ?? [];

  const { data: overallData } = useQuery({
    queryKey: ['hall-overview'],
    queryFn: () => statisticsAPI.getHallOverview(),
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });
  const overview: HallOverview[] = overallData?.data?.data ?? [];
  const totalHalls = overview.length;
  const totalSessions = overview.reduce(
    (sum, h) => sum + (h.totalSessions ?? 0),
    0
  );

  const sendNotifyMutation = useMutation({
    mutationFn: async (payload: {
      message: string;
      hallId?: number;
      sessionId?: number;
    }) => {
      const req: CreateNotificationRequest = {
        title: 'Thông báo hội trường',
        content: payload.message,
        priority: 2,
        isAutomatic: false,
        repeatCount: 1,
        hallId: payload.hallId,
        sessionId: payload.sessionId,
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
          (err?.response?.data?.message ||
            err?.message ||
            'Lỗi không xác định'),
        { duration: 4000, position: 'top-right' }
      );
    },
  });

  const handleSendGeneralNotify = async (item: ActiveHallSummary) => {
    try {
      const res = await checkinAPI.getByHallSession(
        item.hallId,
        item.sessionId
      );

      const extractList = (raw: any): any[] => {
        if (!raw) return [];
        const d = raw.data;
        if (Array.isArray(d)) return d;
        if (Array.isArray(d?.data)) return d.data;
        if (Array.isArray(d?.items)) return d.items;
        if (Array.isArray(d?.data?.items)) return d.data.items;
        return [];
      };
      const all = extractList(res) as any[];
      const unchecked = all.filter((b) => !b?.checkIn);

      const hallLabel = item.hallName || 'hội trường';
      const sessionLabel =
        item.sessionNumber != null ? `Session ${item.sessionNumber}` : '';

      const listText = unchecked
        .map(
          (b) =>
            `Tân cử nhân ${b.fullName} với mã số sinh viên ${b.studentCode}`
        )
        .join('\n');

      const message =
        `Xin mời các Tân cử nhân với mã số sinh viên tới hội trường ${hallLabel} thuộc phiên ${sessionLabel} để làm thủ tục checkin trước khi cổng checkin đóng lại.` +
        (listText ? `\n${listText}` : '');

      sendNotifyMutation.mutate({
        message,
        hallId: item.hallId,
        sessionId: item.sessionId,
      });
    } catch (e) {
      toast.error('Không thể lấy danh sách tân cử nhân.', {
        duration: 3000,
        position: 'top-right',
      });
    }
  };

  return (
    <div className='space-y-6'>
      {/* Breadcrumb Navigation */}
      <Card className='shadow-sm'>
        <CardContent className='p-4'>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href='/' className='flex items-center gap-1.5'>
                  <span>Trang chủ</span>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className='font-medium'>
                  Thống kê tổng quan
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      {!!overview && overview.length > 0 && (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          <Card className='shadow-sm hover:shadow-md transition-shadow'>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div className='space-y-1'>
                  <p className='text-sm font-medium text-muted-foreground'>
                    Tổng hội trường
                  </p>
                  <p className='text-3xl font-bold'>{totalHalls}</p>
                </div>
                <div className='h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center'>
                  <Users className='h-6 w-6 text-blue-600 dark:text-blue-400' />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='shadow-sm hover:shadow-md transition-shadow'>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div className='space-y-1'>
                  <p className='text-sm font-medium text-muted-foreground'>
                    Tổng phiên
                  </p>
                  <p className='text-3xl font-bold'>{totalSessions}</p>
                </div>
                <div className='h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center'>
                  <Calendar className='h-6 w-6 text-green-600 dark:text-green-400' />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='shadow-sm hover:shadow-md transition-shadow'>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div className='space-y-1'>
                  <p className='text-sm font-medium text-muted-foreground'>
                    Phiên đang hoạt động
                  </p>
                  <p className='text-3xl font-bold'>{halls.length}</p>
                </div>
                <div className='h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center'>
                  <Clock className='h-6 w-6 text-orange-600 dark:text-orange-400' />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='shadow-sm hover:shadow-md transition-shadow'>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div className='space-y-1'>
                  <p className='text-sm font-medium text-muted-foreground'>
                    Trạng thái
                  </p>
                  <p className='text-3xl font-bold text-green-600'>Hoạt động</p>
                </div>
                <div className='h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center'>
                  <TrendingUp className='h-6 w-6 text-emerald-600 dark:text-emerald-400' />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Hall Overview Section */}
      {overview.length > 0 && (
        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h2 className='text-2xl font-bold tracking-tight'>
              Tổng quan các hội trường
            </h2>
            <Badge color='secondary' className='text-sm'>
              {overview.length} hội trường
            </Badge>
          </div>

          <div className='grid gap-4 md:grid-cols-1 lg:grid-cols-2'>
            {overview.map((hall) => (
              <Card
                key={`ov-${hall.hallId}`}
                className='shadow-sm hover:shadow-md transition-shadow'
              >
                <CardHeader className='pb-3'>
                  <div className='flex items-center justify-between'>
                    <CardTitle className='text-xl'>
                      Hội trường {hall.hallName}
                    </CardTitle>
                    <Badge color='secondary' className='text-xs'>
                      {hall.totalSessions} phiên
                    </Badge>
                  </div>
                  <CardDescription>Tổng quan tất cả các phiên</CardDescription>
                </CardHeader>
                <CardContent className='space-y-3'>
                  {hall.sessions.map((s) => {
                    const pct = s.totalStudents
                      ? Math.min(
                          100,
                          Math.round((s.checkedInCount / s.totalStudents) * 100)
                        )
                      : 0;
                    const isCur = s.sessionId === hall.currentSessionId;
                    return (
                      <div
                        key={s.sessionId}
                        className={`rounded-lg border p-4 transition-colors bg-card border-border`}
                      >
                        <div className='flex items-center justify-between mb-3'>
                          <div className='flex items-center gap-2'>
                            <span className='font-semibold'>
                              Session {s.sessionNumber}
                            </span>
                          </div>
                          <div className='flex items-center gap-2 text-sm'>
                            <CheckCircle2 className='h-4 w-4 text-muted-foreground' />
                            <span className='font-medium'>
                              {s.checkedInCount}/{s.totalStudents}
                            </span>
                          </div>
                        </div>
                        <div className='space-y-2'>
                          <Progress value={pct} className='h-2' />
                          <div className='flex items-center justify-between text-xs text-muted-foreground'>
                            <span>{pct}% đã check-in</span>
                            <span>
                              {s.totalStudents - s.checkedInCount} còn lại
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Active Sessions Section */}
      <div className='space-y-4'>
        <div className='grid gap-4 md:grid-cols-1 lg:grid-cols-2'>
          {isLoading && (
            <>
              {Array.from({ length: 3 }).map((_, idx) => (
                <Card key={idx} className='shadow-sm'>
                  <CardHeader>
                    <Skeleton className='h-6 w-2/3' />
                    <Skeleton className='h-4 w-1/3 mt-2' />
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <Skeleton className='h-4 w-1/2' />
                    <Skeleton className='h-2 w-full' />
                    <Skeleton className='h-10 w-full' />
                  </CardContent>
                </Card>
              ))}
            </>
          )}

          {!isLoading && isError && (
            <Card className='shadow-sm col-span-full'>
              <CardContent className='p-8 text-center'>
                <div className='mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4'>
                  <Bell className='h-6 w-6 text-red-600 dark:text-red-400' />
                </div>
                <p className='text-sm text-red-600 font-medium'>
                  Không thể tải dữ liệu
                </p>
                <p className='text-xs text-muted-foreground mt-1'>
                  Vui lòng thử lại sau
                </p>
              </CardContent>
            </Card>
          )}

          {!isLoading && !isError && halls.length === 0 && (
            <Card className='shadow-sm col-span-full'>
              <CardContent className='p-8 text-center'>
                <div className='mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4'>
                  <Clock className='h-6 w-6 text-muted-foreground' />
                </div>
                <p className='text-sm font-medium'>
                  Không có phiên nào đang hoạt động
                </p>
                <p className='text-xs text-muted-foreground mt-1'>
                  Dữ liệu sẽ hiển thị khi có phiên mới
                </p>
              </CardContent>
            </Card>
          )}

          {halls.map((item) => {
            const pct = item.totalStudents
              ? Math.min(
                  100,
                  Math.round((item.checkedInCount / item.totalStudents) * 100)
                )
              : 0;
            return (
              <Card
                key={`${item.hallId}-${item.sessionId}`}
                className='shadow-sm hover:shadow-md transition-shadow'
              >
                <CardHeader className='pb-3'>
                  <div className='flex items-center justify-between'>
                    <CardTitle className='text-xl'>
                      Hội trường {item.hallName}
                    </CardTitle>
                    <Badge className='text-xs'>
                      Session {item.sessionNumber}
                    </Badge>
                  </div>
                  <CardDescription>Phiên check-in hiện tại</CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='rounded-lg bg-accent/50 p-4'>
                    <div className='flex items-center justify-between mb-3'>
                      <span className='text-sm font-medium text-muted-foreground'>
                        Tiến độ check-in
                      </span>
                      <div className='flex items-center gap-2'>
                        <CheckCircle2 className='h-4 w-4 text-muted-foreground' />
                        <span className='text-sm font-semibold'>
                          {item.checkedInCount}/{item.totalStudents}
                        </span>
                      </div>
                    </div>
                    <div className='space-y-2'>
                      <Progress value={pct} className='h-2.5' />
                      <div className='flex items-center justify-between text-xs text-muted-foreground'>
                        <span className='font-medium'>{pct}% hoàn thành</span>
                        <span>
                          {item.totalStudents - item.checkedInCount} tân cử nhân
                          chưa check-in
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className='flex justify-end'>
                    <Button
                      size='sm'
                      variant='default'
                      onClick={() => handleSendGeneralNotify(item)}
                      disabled={sendNotifyMutation.isPending}
                      className='gap-2'
                    >
                      <Bell className='h-4 w-4' />
                      {sendNotifyMutation.isPending
                        ? 'Đang gửi...'
                        : 'Gửi thông báo'}
                    </Button>
                  </div>

                  <UncheckedInTable
                    hallId={item.hallId}
                    sessionId={item.sessionId}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
