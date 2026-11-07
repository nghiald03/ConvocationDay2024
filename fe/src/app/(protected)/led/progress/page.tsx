'use client';

import { useEffect, useRef, useState } from 'react';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { AlertTriangle, Gauge, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { hallQueryOptions } from '@/features/hall/queries/hall-query-options';
import { sessionQueryOptions } from '@/features/session/queries/session-query-options';
import { getLedActive } from '@/features/led/api/get-led-active';
import {
  compareSides,
  formatDuration,
  paceMs,
  recordPace,
  sideLabel,
  summarizeProgress,
  type LedActiveSession,
  type PaceSample,
} from '@/features/led/model/led-progress';
import { ledQueueQueryOptions, LED_QUEUE_REFRESH_MS } from '@/features/led/queries/led-queue-query-options';
import { readUrlParam, SessionButtons } from '@/features/led/ui/session-buttons';
import { fallbackInterval } from '@/lib/realtime/realtime-status';
import { cn } from '@/lib/utils';

const AUTO = 'auto';
const STORAGE_KEY = 'led-progress-session';

/** Khóa bắt đầu bằng 'led' nên tự tải lại khi socket báo `data:changed` chủ đề led hoặc check-in. */
const activeQueryOptions = queryOptions({
  queryKey: ['led', 'active'],
  queryFn: getLedActive,
  refetchInterval: fallbackInterval(LED_QUEUE_REFRESH_MS),
  refetchOnWindowFocus: true,
});

function readStored(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? AUTO;
  } catch {
    return AUTO;
  }
}

function store(value: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Trình duyệt chặn lưu trữ: vẫn dùng bình thường, chỉ không nhớ lựa chọn.
  }
}

/**
 * Theo dõi tiến độ chiếu LED theo thời gian thực: mỗi lần MC chuyển người, backend phát `data:changed` qua socket
 * và trang tải lại hàng đợi. Mặc định tự theo phiên đang chiếu của từng side; có thể ghim một phiên.
 * Dùng được trong OBS: chọn phiên bằng nút, hoặc cấu hình sẵn qua URL `?session=<id>` (hoặc `?session=auto`).
 */
export default function LedProgressPage() {
  const [choice, setChoice] = useState(AUTO);
  const { data: halls = [] } = useQuery(hallQueryOptions);
  const { data: sessions = [] } = useQuery(sessionQueryOptions);
  const active = useQuery(activeQueryOptions);

  useEffect(() => setChoice(readUrlParam('session') ?? readStored()), []);

  const choose = (value: string) => {
    setChoice(value);
    store(value);
  };

  const pinned = choice === AUTO ? null : Number(choice);
  const sortedHalls = [...halls].sort(compareSides);

  return (
    <div className='space-y-4'>
      <Card className='relative overflow-hidden'>
        <div className='absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500' />
        <CardContent className='space-y-4 p-4 pt-5'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='flex items-center gap-3'>
              <span className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                <Gauge className='h-5 w-5' aria-hidden='true' />
              </span>
              <div>
                <h1 className='text-xl font-semibold tracking-tight text-default-900'>Tiến độ chiếu LED</h1>
                <p className='text-sm text-muted-foreground'>
                  Cập nhật ngay mỗi khi MC chuyển người. Thời gian còn lại ước theo nhịp chiếu gần nhất.
                </p>
              </div>
            </div>
            <div aria-live='polite'>
              {active.isError ? (
                <Badge color='destructive' variant='soft' className='gap-1.5 normal-case'>
                  <AlertTriangle className='h-3.5 w-3.5' aria-hidden='true' />
                  Lỗi tải dữ liệu, đang thử lại…
                </Badge>
              ) : active.dataUpdatedAt ? (
                <Badge color='secondary' variant='soft' className='gap-1.5 normal-case tabular-nums'>
                  <RefreshCw className={cn('h-3.5 w-3.5', active.isFetching && 'animate-spin')} aria-hidden='true' />
                  Cập nhật lúc {new Date(active.dataUpdatedAt).toLocaleTimeString('vi-VN')}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className='space-y-2'>
            <Label id='led-progress-session-label' className='text-sm font-medium'>
              Phiên
            </Label>
            <SessionButtons
              value={choice}
              onChange={choose}
              labelledBy='led-progress-session-label'
              extraOption={{ value: AUTO, label: 'Tự động (phiên đang chiếu)' }}
            />
          </div>
        </CardContent>
      </Card>

      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
        {sortedHalls.map((hall) => {
          const auto = active.data?.find((item) => item.hallId === hall.hallId) ?? null;
          const sessionId = pinned ?? auto?.sessionId ?? null;
          const pinnedSession = sessions.find((session) => session.sessionId === pinned);
          return (
            <HallProgress
              key={hall.hallId}
              hallId={hall.hallId}
              hallName={hall.hallName}
              sessionId={sessionId}
              sessionLabel={sessionLabelOf(pinned !== null ? (pinnedSession?.session1 ?? pinned) : auto)}
              waitingForAuto={pinned === null && auto === null}
            />
          );
        })}
      </div>
    </div>
  );
}

function sessionLabelOf(session: LedActiveSession | number | null): string {
  if (session === null) return '';
  if (typeof session === 'number') return `Phiên ${session}`;
  return `Phiên ${session.sessionNumber ?? session.sessionId}${session.description ? ` · ${session.description}` : ''}`;
}

function HallProgress({
  hallId,
  hallName,
  sessionId,
  sessionLabel,
  waitingForAuto,
}: {
  hallId: number;
  hallName: string;
  sessionId: number | null;
  sessionLabel: string;
  waitingForAuto: boolean;
}) {
  const { data: queue, isLoading } = useQuery(ledQueueQueryOptions(hallId, sessionId));
  const summary = summarizeProgress(queue);
  const pace = usePace(sessionId, queue?.currentIndex ?? null);
  const eta = pace !== null && summary.remaining > 0 ? pace * summary.remaining : null;

  return (
    <Card className='overflow-hidden'>
      <CardContent className='space-y-5 p-5'>
        <div className='flex flex-wrap items-baseline justify-between gap-2'>
          <h2 className='text-2xl font-bold tracking-tight text-default-900'>{sideLabel(hallName)}</h2>
          {sessionLabel ? <span className='text-base font-semibold text-muted-foreground'>{sessionLabel}</span> : null}
        </div>

        {sessionId === null ? (
          <p className='rounded-lg border border-dashed p-6 text-center text-muted-foreground'>
            {waitingForAuto ? 'Side này chưa chiếu ai. Màn hình tự chuyển khi MC bắt đầu.' : 'Chọn phiên để theo dõi.'}
          </p>
        ) : isLoading ? (
          <p className='p-6 text-center text-muted-foreground'>Đang tải…</p>
        ) : (
          <>
            <div className='space-y-2'>
              <div className='flex items-end justify-between gap-3 tabular-nums'>
                <span className='text-5xl font-extrabold leading-none text-default-900'>{summary.percent}%</span>
                <span className='text-lg font-semibold text-default-700'>
                  {summary.shown} / {summary.total} người
                </span>
              </div>
              <div
                role='progressbar'
                aria-valuemin={0}
                aria-valuemax={summary.total}
                aria-valuenow={summary.shown}
                aria-label={`Đã chiếu ${summary.shown} trên ${summary.total} người`}
                className='h-4 w-full overflow-hidden rounded-full bg-default-200'
              >
                <div
                  className='h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-[width] duration-500'
                  style={{ width: `${summary.percent}%` }}
                />
              </div>
            </div>

            <dl className='grid grid-cols-3 gap-3 text-center tabular-nums'>
              <Stat label='Còn lại' value={String(summary.remaining)} />
              <Stat label='Trễ ở cuối còn chờ' value={String(summary.remainingTail)} />
              <Stat
                label='Ước còn'
                value={summary.remaining === 0 && summary.started ? 'Xong' : eta !== null ? formatDuration(eta) : '—'}
                hint={pace !== null ? `~${formatDuration(pace)}/người` : 'Đang đo nhịp…'}
              />
            </dl>

            {summary.current ? (
              <div className='rounded-xl border-2 border-blue-600/40 bg-blue-600/5 p-4'>
                <p className='text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300'>
                  Đang chiếu · #{summary.current.position}
                </p>
                <p className='mt-1 text-2xl font-bold leading-tight text-default-900'>{summary.current.fullName}</p>
                <p className='text-sm text-muted-foreground tabular-nums'>
                  {summary.current.studentCode} · Ghế {summary.current.chair ?? '-'}
                  {summary.current.attendanceStatus === 2 ? ' · đến trễ' : ''}
                </p>
              </div>
            ) : (
              <p className='rounded-lg border border-dashed p-4 text-center text-muted-foreground'>
                LED chưa bắt đầu chiếu phiên này.
              </p>
            )}

            {summary.upcoming.length > 0 ? (
              <div className='space-y-2'>
                <p className='text-sm font-semibold text-default-700'>Kế tiếp</p>
                <ol className='space-y-1.5'>
                  {summary.upcoming.map((item) => (
                    <li
                      key={item.id}
                      className='flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm'
                    >
                      <span className='min-w-0 truncate'>
                        <span className='mr-2 text-muted-foreground tabular-nums'>#{item.position}</span>
                        <span className='font-medium text-default-900'>{item.fullName}</span>
                      </span>
                      <span className='shrink-0 tabular-nums text-muted-foreground'>
                        Ghế {item.chair ?? '-'}
                        {item.isTail ? ' · trễ' : ''}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className='rounded-lg border p-3'>
      <dt className='text-xs text-muted-foreground'>{label}</dt>
      <dd className='mt-1 text-xl font-bold text-default-900'>{value}</dd>
      {hint ? <dd className='mt-0.5 text-[11px] text-muted-foreground'>{hint}</dd> : null}
    </div>
  );
}

/** Nhịp chiếu (ms/người) đo từ các lần vị trí đang chiếu đổi; đổi phiên thì đo lại từ đầu. */
function usePace(sessionId: number | null, currentIndex: number | null): number | null {
  const samples = useRef<{ sessionId: number | null; list: PaceSample[] }>({ sessionId: null, list: [] });
  const [pace, setPace] = useState<number | null>(null);

  useEffect(() => {
    if (samples.current.sessionId !== sessionId) samples.current = { sessionId, list: [] };
    if (currentIndex === null) {
      samples.current.list = [];
    } else {
      samples.current.list = recordPace(samples.current.list, { index: currentIndex, at: Date.now() });
    }
    setPace(paceMs(samples.current.list));
  }, [sessionId, currentIndex]);

  return pace;
}
