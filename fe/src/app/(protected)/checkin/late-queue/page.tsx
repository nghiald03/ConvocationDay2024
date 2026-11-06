'use client';

import { useQuery } from '@tanstack/react-query';
import { Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { hallQueryOptions } from '@/features/hall/queries/hall-query-options';
import { LateQueuePanel } from '@/features/led/ui/late-queue-panel';
import { QueueSessionSelect, useStoredSession } from '@/features/led/ui/queue-session-select';

/** Điều phối: ai đến trễ phải xếp xuống cuối phiên và xếp hàng sau người nào, theo từng side. */
export default function LateQueuePage() {
  const { value, select, sessionId } = useStoredSession('late-queue-session');
  const { data: halls = [] } = useQuery(hallQueryOptions);

  return (
    <div className='space-y-4'>
      <Card>
        <CardContent className='space-y-4 p-4'>
          <div className='flex items-center gap-3'>
            <span className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <Clock className='h-5 w-5' aria-hidden='true' />
            </span>
            <div>
              <h1 className='text-xl font-semibold tracking-tight text-default-900'>Danh sách đến trễ</h1>
              <p className='text-sm text-muted-foreground'>
                Người check-in sau khi phiên đóng. Họ ngồi lại ghế cũ, trang báo khi LED gọi hoặc sắp gọi tới họ. Tự cập nhật
                ngay khi có thay đổi.
              </p>
            </div>
          </div>
          <div className='max-w-sm'>
            <QueueSessionSelect id='late-queue-session' value={value} onChange={select} />
          </div>
        </CardContent>
      </Card>

      {sessionId === null ? (
        <p className='p-6 text-center text-muted-foreground'>Chọn phiên để xem danh sách đến trễ.</p>
      ) : (
        <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
          {halls.map((hall) => (
            <LateQueuePanel key={hall.hallId} hall={hall} sessionId={sessionId} />
          ))}
        </div>
      )}
    </div>
  );
}
