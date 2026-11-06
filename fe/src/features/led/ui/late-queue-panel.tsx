'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Armchair, BellRing } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Hall } from '@/features/hall/model/hall';
import { selectCallStrip, sittingSeat, type UpcomingLate } from '../model/late-call';
import { selectLateItems, type LedQueueItem } from '../model/led-queue';
import { ledQueueQueryOptions } from '../queries/led-queue-query-options';
import { formatTime, PROGRESS } from './queue-display';

function turnsText(turns: number | null) {
  if (turns === null) return 'LED chưa chiếu tới';
  return turns === 0 ? 'đang gọi' : turns === 1 ? 'ngay sau người đang chiếu' : `còn ${turns} lượt nữa`;
}

/** Dải trên đầu: người đến trễ đang được LED gọi (to, nổi) và những người sắp gọi, kèm chỗ họ đang ngồi. */
function CallStrip({ calling, upcoming }: { calling: LedQueueItem | null; upcoming: UpcomingLate[] }) {
  if (!calling && upcoming.length === 0) return null;
  return (
    <div className='space-y-2' aria-live='polite'>
      {calling && (
        <div className='flex flex-wrap items-center gap-3 rounded-lg bg-amber-500 px-4 py-3 text-white shadow'>
          <BellRing className='h-6 w-6 shrink-0' aria-hidden='true' />
          <div className='min-w-0 flex-1'>
            <div className='text-xs font-semibold uppercase tracking-wide opacity-90'>Đang gọi trên LED</div>
            <div className='truncate text-lg font-bold'>
              {calling.fullName} <span className='font-medium opacity-90'>· {calling.studentCode}</span>
            </div>
          </div>
          <div className='flex items-center gap-2 rounded-md bg-white/20 px-3 py-1.5 text-lg font-bold'>
            <Armchair className='h-5 w-5' aria-hidden='true' />
            Ngồi ghế {sittingSeat(calling) ?? '-'}
          </div>
        </div>
      )}
      {upcoming.length > 0 && (
        <div className='rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2'>
          <div className='mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400'>
            Sắp gọi
          </div>
          <ul className='space-y-1'>
            {upcoming.map(({ item, turnsAway }) => (
              <li key={item.id} className='flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm'>
                <span className='min-w-12 font-bold tabular-nums'>{sittingSeat(item) ?? '-'}</span>
                <span className='font-medium'>{item.fullName}</span>
                <span className='tabular-nums text-muted-foreground'>{item.studentCode}</span>
                <span className='ml-auto text-xs text-muted-foreground'>{turnsText(turnsAway)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function LateTable({ items, tail }: { items: LedQueueItem[]; tail: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className='w-24'>Ngồi tại</TableHead>
          <TableHead>Họ tên</TableHead>
          <TableHead>MSSV</TableHead>
          <TableHead>Thứ tự gọi trên LED</TableHead>
          <TableHead>Check-in lúc</TableHead>
          <TableHead>Trạng thái</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id} className={item.progress === 'current' ? 'bg-amber-500/15' : undefined}>
            <TableCell className='text-base font-bold tabular-nums'>{sittingSeat(item) ?? '-'}</TableCell>
            <TableCell className='font-medium'>{item.fullName}</TableCell>
            <TableCell className='tabular-nums'>{item.studentCode}</TableCell>
            <TableCell className='tabular-nums text-muted-foreground'>
              {tail ? `#${item.position} · ${item.chair ?? '-'}` : `#${item.position}`}
            </TableCell>
            <TableCell className='tabular-nums'>{formatTime(item.timeCheckIn)}</TableCell>
            <TableCell>
              <Badge color={PROGRESS[item.progress].color} variant='soft' className='normal-case'>
                {PROGRESS[item.progress].label}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Người đến trễ của một side trong một phiên. Họ vẫn ngồi ghế cũ; bảng cho biết ghế đó và thứ tự LED sẽ gọi,
 * còn dải trên đầu báo ai đang được gọi và ai sắp được gọi để điều phối dẫn lên đúng lúc.
 */
export function LateQueuePanel({ hall, sessionId }: { hall: Hall; sessionId: number }) {
  const { data, isLoading, isError } = useQuery(ledQueueQueryOptions(hall.hallId, sessionId));
  const { movedToEnd, keptSeat } = selectLateItems(data);
  const { calling, upcoming } = selectCallStrip(data);
  const currentChair = data?.currentIndex == null ? null : (data.items[data.currentIndex]?.chair ?? null);

  return (
    <Card>
      <CardContent className='space-y-4 p-4'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h2 className='text-lg font-semibold text-default-900'>{hall.hallName}</h2>
          <div className='flex flex-wrap gap-2'>
            <Badge color='secondary' variant='soft' className='normal-case tabular-nums'>
              Đã check-in: {data?.total ?? 0}
            </Badge>
            <Badge color='info' variant='soft' className='normal-case tabular-nums'>
              LED đang chiếu: {currentChair ?? 'chưa chiếu'}
            </Badge>
          </div>
        </div>

        {isError ? (
          <p className='flex items-center gap-2 text-sm text-destructive'>
            <AlertTriangle className='h-4 w-4' aria-hidden='true' />
            Không tải được hàng đợi, đang thử lại…
          </p>
        ) : isLoading ? (
          <p className='text-sm text-muted-foreground'>Đang tải…</p>
        ) : (
          <>
            <CallStrip calling={calling} upcoming={upcoming} />

            <section className='space-y-2' aria-label='Bị xếp xuống cuối phiên'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <h3 className='text-sm font-semibold'>Bị xếp xuống cuối phiên ({movedToEnd.length})</h3>
                {movedToEnd.length > 0 && (
                  <span className='text-xs text-muted-foreground'>
                    Các bạn này ngồi lại ghế cũ, được gọi lên theo thứ tự LED
                  </span>
                )}
              </div>
              {movedToEnd.length > 0 ? (
                <LateTable items={movedToEnd} tail />
              ) : (
                <p className='text-sm text-muted-foreground'>Chưa có ai bị xếp xuống cuối.</p>
              )}
            </section>

            {keptSeat.length > 0 && (
              <section className='space-y-2' aria-label='Trễ nhưng giữ ghế'>
                <h3 className='text-sm font-semibold'>Trễ nhưng giữ nguyên ghế ({keptSeat.length})</h3>
                <LateTable items={keptSeat} tail={false} />
              </section>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
