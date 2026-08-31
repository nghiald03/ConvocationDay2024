'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Camera, MonitorUp } from 'lucide-react';
import { photoQueuePublicStateQueryOptions } from '../queries/photo-queue-query-options';

export function PhotoQueueDisplayPage() {
  const searchParams = useSearchParams();
  const photoSessionId = searchParams?.get('photoSessionId') ?? '';
  const { data } = useQuery(photoQueuePublicStateQueryOptions(photoSessionId || undefined));

  const currentName = useMemo(() => data?.current?.fullName ?? 'Đang chờ điều phối', [data]);

  return (
    <main className='min-h-screen bg-background text-foreground'>
      <div className='mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-8'>
        <section className='grid flex-1 grid-cols-1 items-stretch gap-6 lg:grid-cols-[1fr_360px]'>
          <div className='flex min-h-[520px] flex-col items-center justify-center rounded-lg border bg-card p-8 text-card-foreground shadow-sm'>
            <div className='mb-8 flex items-center gap-3 text-xl font-semibold text-muted-foreground'>
              <MonitorUp className='h-7 w-7 text-foreground' />
              <span>Phiên chụp ảnh #{(data?.photoSessionId ?? photoSessionId) || '-'}</span>
            </div>
            <div className='text-center'>
              <p className='text-2xl font-semibold text-muted-foreground'>Số đang chụp</p>
              <p className='mt-4 text-[168px] font-black leading-none text-foreground'>
                {data?.currentNumber ?? 0}
              </p>
              <p className='mt-6 text-4xl font-bold'>{currentName}</p>
              {data?.current?.studentCode && (
                <p className='mt-3 text-2xl font-semibold text-muted-foreground'>
                  {data.current.studentCode}
                </p>
              )}
            </div>
          </div>

          <aside className='flex flex-col justify-between rounded-lg border bg-card p-6 text-card-foreground shadow-sm'>
            <div>
              <div className='flex items-center gap-2 text-lg font-semibold'>
                <Camera className='h-5 w-5 text-foreground' />
                Tiếp theo
              </div>
              <p className='mt-8 text-7xl font-black text-foreground'>{data?.next?.queueNumber ?? '-'}</p>
              <p className='mt-5 text-2xl font-bold'>{data?.next?.fullName ?? 'Chưa có số tiếp theo'}</p>
              {data?.next?.studentCode && (
                <p className='mt-2 text-lg text-muted-foreground'>{data.next.studentCode}</p>
              )}
            </div>
            <p className='text-sm text-muted-foreground'>Màn hình này tự cập nhật mỗi 2 giây.</p>
          </aside>
        </section>
      </div>
    </main>
  );
}
