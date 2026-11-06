'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ATTENDANCE_LATE, filterQueueItems } from '../model/led-queue';
import { ledQueueQueryOptions } from '../queries/led-queue-query-options';
import { InlineModal } from './inline-modal';
import { PROGRESS } from './queue-display';

/** MC chọn một người trong hàng đợi của phiên để chuyển LED tới đó. Chỉ người đã check-in mới có trong hàng đợi. */
export function LedJumpPanel({
  hall,
  session,
  busy,
  onJump,
  onClose,
}: {
  hall: number;
  session: number;
  busy: boolean;
  onJump: (studentCode: string) => void;
  onClose: () => void;
}) {
  const { data, isLoading, isError } = useQuery(ledQueueQueryOptions(hall, session));
  const [keyword, setKeyword] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);
  const items = filterQueueItems(data?.items ?? [], keyword);

  // Mở lên thì cuộn tới người đang chiếu một lần, các lần làm mới sau không kéo danh sách giật lại.
  useEffect(() => {
    if (scrolledRef.current || !data?.items.length) return;
    scrolledRef.current = true;
    listRef.current?.querySelector('[data-current="true"]')?.scrollIntoView({ block: 'center' });
  }, [data]);

  return (
    <InlineModal title='Chuyển LED tới tân cử nhân' onClose={onClose}>
      <div className='relative'>
        <Search
          className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground'
          aria-hidden='true'
        />
        <Input
          autoFocus
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder='Tìm theo tên, MSSV hoặc ghế'
          aria-label='Tìm tân cử nhân'
          className='h-11 pl-9'
        />
      </div>

      {isError ? (
        <p className='text-sm text-destructive'>Không tải được hàng đợi, đang thử lại…</p>
      ) : isLoading ? (
        <p className='text-sm text-muted-foreground'>Đang tải…</p>
      ) : items.length === 0 ? (
        <p className='text-sm text-muted-foreground'>
          {keyword.trim() ? 'Không có ai khớp từ khóa.' : 'Hàng đợi chưa có ai (chỉ người đã check-in mới có mặt).'}
        </p>
      ) : (
        <div ref={listRef} className='-mx-1 flex-1 space-y-1 overflow-auto px-1'>
          {items.map((item) => (
            <button
              key={item.id}
              type='button'
              data-current={item.progress === 'current'}
              disabled={busy || item.progress === 'current'}
              onClick={() => onJump(item.studentCode)}
              className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-orange-50 disabled:cursor-not-allowed dark:hover:bg-orange-950/30 ${
                item.progress === 'current'
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40'
                  : 'border-border'
              } ${item.progress === 'done' ? 'opacity-60' : ''}`}
            >
              <span className='w-10 shrink-0 text-right text-sm tabular-nums text-muted-foreground'>
                {item.position}
              </span>
              <span className='w-14 shrink-0 font-semibold tabular-nums'>{item.chair ?? '-'}</span>
              <span className='min-w-0 flex-1'>
                <span className='block truncate font-medium'>{item.fullName}</span>
                <span className='block text-sm tabular-nums text-muted-foreground'>{item.studentCode}</span>
              </span>
              {item.attendanceStatus === ATTENDANCE_LATE && (
                <Badge color='warning' variant='soft' className='normal-case'>
                  Trễ
                </Badge>
              )}
              <Badge color={PROGRESS[item.progress].color} variant='soft' className='normal-case'>
                {PROGRESS[item.progress].label}
              </Badge>
            </button>
          ))}
        </div>
      )}
    </InlineModal>
  );
}
