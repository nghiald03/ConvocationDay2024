'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getBachelors } from '@/features/bachelor/api/get-bachelors';
import { sessionQueryOptions } from '@/features/session/queries/session-query-options';
import { SeatBoard, SeatLegend } from '@/features/led/ui/seat-board';
import type { SeatSide } from '@/features/led/model/seat-board';

const STORAGE_KEY = 'led-seat-board-session';
const SIDE_STORAGE_KEY = 'led-seat-board-side';
const REFRESH_MS = 5000;

function readStored(key: string) {
  try {
    return window.localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function store(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Trình duyệt chặn lưu trữ: vẫn chạy bình thường, chỉ không nhớ lựa chọn.
  }
}

/** Màn hình LED đầu giờ: ai đã check-in theo sơ đồ ghế cố định của hội trường. */
export default function SeatBoardPage() {
  const [sessionId, setSessionId] = useState('');
  const [side, setSide] = useState<SeatSide>('Left');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const screenRef = useRef<HTMLDivElement>(null);
  const { data: sessions = [] } = useQuery(sessionQueryOptions);

  useEffect(() => {
    setSessionId(readStored(STORAGE_KEY));
    if (readStored(SIDE_STORAGE_KEY) === 'Right') setSide('Right');
  }, []);
  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const { data, isFetching, isError, dataUpdatedAt } = useQuery({
    queryKey: ['led', 'seat-board', sessionId],
    queryFn: () => getBachelors({ pageIndex: 1, pageSize: 2000, session: sessionId }),
    enabled: sessionId !== '',
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: true,
  });

  const selectSession = (value: string) => {
    setSessionId(value);
    store(STORAGE_KEY, value);
  };

  const selectSide = (value: SeatSide) => {
    setSide(value);
    store(SIDE_STORAGE_KEY, value);
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await screenRef.current?.requestFullscreen();
  };

  const selected = sessions.find((session) => String(session.sessionId) === sessionId);
  const sessionLabel = selected
    ? `Phiên ${selected.session1 ?? selected.sessionId}${selected.description ? ` · ${selected.description}` : ''}`
    : '';

  return (
    <div className='space-y-4'>
      <Card>
        <CardContent className='flex flex-wrap items-center gap-3 p-3'>
          <span className='font-semibold'>Sơ đồ check-in đầu giờ</span>
          <select
            className='h-9 rounded-md border border-default-300 bg-background px-2 text-sm'
            value={sessionId}
            onChange={(event) => selectSession(event.target.value)}
          >
            <option value=''>Chọn phiên…</option>
            {sessions.map((session) => (
              <option key={session.sessionId} value={session.sessionId}>
                Phiên {session.session1 ?? session.sessionId}
                {session.description ? ` · ${session.description}` : ''}
              </option>
            ))}
          </select>
          <div className='flex overflow-hidden rounded-md border border-default-300'>
            {(['Left', 'Right'] as const).map((value) => (
              <button
                key={value}
                type='button'
                onClick={() => selectSide(value)}
                className={`px-3 py-1.5 text-sm font-semibold ${side === value ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
              >
                {value === 'Left' ? 'Left (25–50)' : 'Right (01–24)'}
              </button>
            ))}
          </div>
          <Button size='sm' onClick={() => void toggleFullscreen()} disabled={!sessionId}>
            Toàn màn hình
          </Button>
          <span className='text-xs text-default-500'>
            {isError
              ? 'Lỗi tải dữ liệu, đang thử lại…'
              : dataUpdatedAt
                ? `Cập nhật lúc ${new Date(dataUpdatedAt).toLocaleTimeString('vi-VN')}${isFetching ? ' …' : ''}`
                : ''}
          </span>
        </CardContent>
      </Card>

      <div
        ref={screenRef}
        className={`bg-orange-50 ${isFullscreen ? 'flex h-screen w-screen flex-col justify-center overflow-hidden p-6' : 'rounded-lg p-3'}`}
      >
        {!sessionId ? (
          <p className='p-6 text-center text-default-500'>Chọn phiên để hiển thị sơ đồ.</p>
        ) : (
          <>
            <div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
              <span className='text-lg font-bold text-slate-800'>{sessionLabel}</span>
              <SeatLegend />
            </div>
            <SeatBoard occupants={data?.items ?? []} side={side} />
          </>
        )}
      </div>
    </div>
  );
}
