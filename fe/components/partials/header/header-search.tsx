'use client';
import React from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfig } from '@/hooks/use-config';
import { useQuery } from '@tanstack/react-query';
import { testing } from '@/config/axios';
import { Badge } from '@/components/ui/badge';

const HeaderSearch = () => {
  const [config] = useConfig();
  const [manualOpen, setManualOpen] = React.useState(false);

  const { isLoading, isError, refetch, dataUpdatedAt, isFetching } = useQuery({
    queryKey: ['server-connectivity'],
    queryFn: async () => {
      const res = await testing.connect();
      return res?.data ?? true;
    },
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    retry: 0, // không tự retry, để người dùng ấn "Thử lại"
    staleTime: 30_000,
  });

  // Mở/đóng dialog theo trạng thái: offline -> luôn mở
  const open = isError || manualOpen;

  const lastChecked = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : '—';

  const StatusPill = () => {
    if (isLoading) {
      return (
        <span className='inline-flex items-center gap-1'>
          <Loader2 className='h-4 w-4 animate-spin' />
          <span>Đang kiểm tra…</span>
        </span>
      );
    }
    if (isError) {
      return (
        <span className='inline-flex items-center gap-1 text-destructive'>
          <XCircle className='h-4 w-4' />
          <span>Mất kết nối</span>
        </span>
      );
    }
    return (
      <span className='inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-500'>
        <CheckCircle2 className='h-4 w-4' />
        <span>Đã kết nối với máy chủ</span>
      </span>
    );
  };

  if (config.layout === 'horizontal') return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Khi offline, không cho đóng
        if (isError) return;
        setManualOpen(next);
      }}
    >
      {/* Nút ở header: chỉ để mở dialog khi đang online */}
      <DialogTrigger asChild>
        <button
          type='button'
          className='flex items-center xl:text-sm text-lg xl:text-default-400 text-default-800 dark:text-default-700 gap-2'
          disabled={isError} // offline: dialog đã mở sẵn và bị khóa
          onClick={() => setManualOpen(true)}
        >
          <StatusPill />
        </button>
      </DialogTrigger>

      <DialogContent
        className='sm:max-w-[480px]'
        // Chặn đóng bằng click ra ngoài và ESC khi offline
        onPointerDownOutside={(e) => {
          if (isError) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isError) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {isError ? 'Mất kết nối máy chủ' : 'Trạng thái máy chủ'}
          </DialogTitle>
        </DialogHeader>

        <div className='grid gap-4 py-2'>
          <div className='flex items-center justify-between'>
            <span className='text-sm text-muted-foreground'>Kết nối</span>
            <Badge
              color={
                isLoading ? 'secondary' : isError ? 'destructive' : 'default'
              }
              className='flex items-center gap-1'
            >
              {isLoading ? (
                <>
                  <Loader2 className='h-3.5 w-3.5 animate-spin' />
                  Đang kiểm tra…
                </>
              ) : isError ? (
                <>
                  <XCircle className='h-3.5 w-3.5' />
                  Mất kết nối
                </>
              ) : (
                <>
                  <CheckCircle2 className='h-3.5 w-3.5' />
                  Đã kết nối với máy chủ
                </>
              )}
            </Badge>
          </div>

          <div className='flex items-center justify-between'>
            <span className='text-sm text-muted-foreground'>Lần kiểm tra</span>
            <span className='text-sm'>{lastChecked}</span>
          </div>

          {isError && (
            <div className='rounded-xl border p-3 text-sm bg-destructive/5 border-destructive/30'>
              <div className='mb-1 font-medium'>Ứng dụng đang ngoại tuyến</div>
              <ul className='list-disc pl-5 space-y-1'>
                <li>Không thể thao tác cho tới khi kết nối được khôi phục.</li>
                <li>Tự động thử lại mỗi 1 phút, hoặc ấn “Thử lại”.</li>
                <li>Kiểm tra đường mạng / server backend.</li>
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className='gap-2'>
          <Button
            color='secondary'
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Đang thử lại…
              </>
            ) : (
              'Thử lại'
            )}
          </Button>

          {/* Khi offline: ẩn/khóa nút Đóng để chặn thao tác */}
          {!isError ? (
            <DialogClose asChild>
              <Button>Đóng</Button>
            </DialogClose>
          ) : (
            <Button disabled>Đóng</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HeaderSearch;
