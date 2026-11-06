'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ListOrdered, Play, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSession } from '@/features/auth/queries/session-provider';
import { hallQueryOptions } from '@/features/hall/queries/hall-query-options';
import { startLedQueue } from '@/features/led/api/get-led-queue';
import { classifyStartError, describeStartOutcomes, type StartOutcome } from '@/features/led/model/start-led';
import toast from '@/lib/toast';
import { LedQueuePanel } from '@/features/led/ui/led-queue-panel';
import { QueueSessionSelect, useStoredSession } from '@/features/led/ui/queue-session-select';

/** Manager: xem toàn bộ thứ tự LED sẽ chiếu của từng side trong một phiên. */
export default function LedQueuePage() {
  const { value, select, sessionId } = useStoredSession('led-queue-session');
  const [keyword, setKeyword] = useState('');
  const { data: halls = [] } = useQuery(hallQueryOptions);
  const queryClient = useQueryClient();
  // Chỉ Manager được bắt đầu chiếu (backend cũng chặn các vai trò khác).
  const canStart = useSession()?.role === 'MN';

  const startAll = useMutation({
    mutationFn: async (targetSession: number) => {
      const outcomes: { hallName: string; outcome: StartOutcome }[] = [];
      for (const hall of halls) {
        try {
          await startLedQueue(hall.hallId, targetSession, false);
          outcomes.push({ hallName: hall.hallName, outcome: 'started' });
        } catch (error) {
          outcomes.push({ hallName: hall.hallName, outcome: classifyStartError(error) });
        }
      }
      return outcomes;
    },
    onSuccess: (outcomes) => {
      const summary = describeStartOutcomes(outcomes);
      const notify = summary.ok ? toast.success : toast.error;
      notify(summary.message, { duration: 6000, position: 'top-right' });
      queryClient.invalidateQueries({ queryKey: ['led', 'queue'] });
    },
  });

  return (
    <div className='space-y-4'>
      <Card>
        <CardContent className='space-y-4 p-4'>
          <div className='flex items-center gap-3'>
            <span className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <ListOrdered className='h-5 w-5' aria-hidden='true' />
            </span>
            <div>
              <h1 className='text-xl font-semibold tracking-tight text-default-900'>Hàng đợi LED</h1>
              <p className='text-sm text-muted-foreground'>
                Thứ tự MC sẽ chiếu, cùng nguồn với nút chuyển của MC. Tự cập nhật ngay khi có thay đổi.
              </p>
            </div>
          </div>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <QueueSessionSelect id='led-queue-session' value={value} onChange={select} />
              {canStart && (
                <Button
                  type='button'
                  onClick={() => sessionId !== null && startAll.mutate(sessionId)}
                  disabled={sessionId === null || startAll.isPending}
                  className='gap-1.5'
                >
                  <Play className='h-4 w-4' aria-hidden='true' />
                  {startAll.isPending ? 'Đang bắt đầu…' : 'Bắt đầu tất cả side của phiên'}
                </Button>
              )}
            </div>
            <div className='space-y-2'>
              <Label htmlFor='led-queue-search' className='text-sm font-medium'>
                Tìm theo tên, MSSV hoặc ghế
              </Label>
              <div className='relative'>
                <Search
                  className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground'
                  aria-hidden='true'
                />
                <Input
                  id='led-queue-search'
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder='Ví dụ: Nguyen, SE1000, C10'
                  className='h-11 pl-9'
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {sessionId === null ? (
        <p className='p-6 text-center text-muted-foreground'>Chọn phiên để xem hàng đợi LED.</p>
      ) : (
        <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
          {halls.map((hall) => (
            <LedQueuePanel key={hall.hallId} hall={hall} sessionId={sessionId} keyword={keyword} canStart={canStart} />
          ))}
        </div>
      )}
    </div>
  );
}
