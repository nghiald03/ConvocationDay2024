'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Armchair, Maximize2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { getBachelors } from '@/features/bachelor/api/get-bachelors';
import { sessionQueryOptions } from '@/features/session/queries/session-query-options';
import { fallbackInterval } from '@/lib/realtime/realtime-status';
import { Be_Vietnam_Pro } from 'next/font/google';
import { SeatingMap } from '@/features/led/ui/seating-map/seating-map';
import type { SeatOccupant, SeatSide } from '@/features/led/model/seat-board';

// Chỉ áp dụng cho khung sơ đồ này, không đụng đến font chung của ứng dụng.
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['500', '600', '700', '800'],
  display: 'swap',
});

const NO_OCCUPANTS: SeatOccupant[] = [];

const STORAGE_KEY = 'led-seat-board-session';
const SIDE_STORAGE_KEY = 'led-seat-board-side';
const REFRESH_MS = 5000;

const SIDE_OPTIONS: { value: SeatSide; label: string; range: string }[] = [
  { value: 'Left', label: 'Bên trái', range: '25–50' },
  { value: 'Right', label: 'Bên phải', range: '01–24' },
];

/**
 * Kích thước màn LED. Toàn màn hình vẽ sơ đồ trên khung đúng cỡ này rồi thu/phóng cho vừa
 * màn đang dùng, nên máy khác cỡ vẫn ra đúng bố cục của màn LED.
 */
type ScreenSize = { id: string; width: number; height: number; compact: boolean };
const SCREEN_SIZES: readonly ScreenSize[] = [
  { id: 'wide', width: 1280, height: 768, compact: true },
  { id: 'tall', width: 1280, height: 1526, compact: false },
  { id: 'fhd', width: 1920, height: 1080, compact: false },
];

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
  const [screenSize, setScreenSize] = useState<ScreenSize>(SCREEN_SIZES[0]!);
  const [viewport, setViewport] = useState({ width: 1280, height: 768 });
  const screenRef = useRef<HTMLDivElement>(null);
  const { data: sessions = [] } = useQuery(sessionQueryOptions);

  useEffect(() => {
    setSessionId(readStored(STORAGE_KEY));
    if (readStored(SIDE_STORAGE_KEY) === 'Right') setSide('Right');
  }, []);
  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(document.fullscreenElement !== null);
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    document.addEventListener('fullscreenchange', onChange);
    window.addEventListener('resize', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      window.removeEventListener('resize', onChange);
    };
  }, []);

  const { data, isFetching, isError, dataUpdatedAt } = useQuery({
    queryKey: ['led', 'seat-board', sessionId],
    queryFn: () => getBachelors({ pageIndex: 1, pageSize: 2000, session: sessionId }),
    enabled: sessionId !== '',
    refetchInterval: fallbackInterval(REFRESH_MS),
    refetchOnWindowFocus: true,
  });

  const selectSession = (value: string) => {
    setSessionId(value);
    store(STORAGE_KEY, value);
  };

  const selectSide = (value: string) => {
    // ToggleGroup trả về '' khi bấm lại mục đang chọn; luôn phải có một bên được chọn.
    if (value !== 'Left' && value !== 'Right') return;
    setSide(value);
    store(SIDE_STORAGE_KEY, value);
  };

  // Đang toàn màn hình không còn thanh điều khiển, nên ← / → đổi sang bên trái / bên phải.
  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const next: SeatSide | null =
        event.key === 'ArrowLeft' ? 'Left' : event.key === 'ArrowRight' ? 'Right' : null;
      if (!next) return;
      event.preventDefault();
      setSide(next);
      store(SIDE_STORAGE_KEY, next);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreen]);

  const startFullscreen = async (size: ScreenSize) => {
    setScreenSize(size);
    try {
      await screenRef.current?.requestFullscreen();
    } catch {
      // Trình duyệt từ chối toàn màn hình (ví dụ iframe không cho phép): giữ nguyên giao diện.
    }
  };

  const occupants: SeatOccupant[] = data?.items ?? NO_OCCUPANTS;
  const stageScale = Math.min(viewport.width / screenSize.width, viewport.height / screenSize.height);
  // Màn khác tỉ lệ với khung LED sẽ có dải trống ở hai bên hoặc trên dưới. Bù phần chênh vào lề của trục còn lại
  // để khoảng cách từ sơ đồ tới mép màn hình ở trên, dưới, trái, phải luôn bằng nhau.
  const basePadding = screenSize.compact ? 12 : Math.round(screenSize.width * 0.015);
  const barX = Math.max(0, (viewport.width - screenSize.width * stageScale) / 2);
  const barY = Math.max(0, (viewport.height - screenSize.height * stageScale) / 2);
  const stagePadding = `${basePadding + barX / stageScale}px ${basePadding + barY / stageScale}px`;


  return (
    <div className='space-y-4'>
      <Card className='relative overflow-hidden'>
        {/* Dải màu nhấn thương hiệu, cùng kiểu với bộ chọn side/session */}
        <div className='absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500' />
        <CardContent className='space-y-4 p-4 pt-5'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='flex items-center gap-3'>
              <span className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                <Armchair className='h-5 w-5' aria-hidden='true' />
              </span>
              <div>
                <h1 className='text-xl font-semibold tracking-tight text-default-900'>
                  Sơ đồ check-in đầu giờ
                </h1>
                <p className='text-sm text-muted-foreground'>
                  Ai đã check-in theo sơ đồ ghế cố định, tự cập nhật mỗi {REFRESH_MS / 1000} giây.
                </p>
              </div>
            </div>

            <div aria-live='polite'>
              {isError ? (
                <Badge color='destructive' variant='soft' className='gap-1.5 normal-case'>
                  <AlertTriangle className='h-3.5 w-3.5' aria-hidden='true' />
                  Lỗi tải dữ liệu, đang thử lại…
                </Badge>
              ) : dataUpdatedAt ? (
                <Badge color='secondary' variant='soft' className='gap-1.5 normal-case tabular-nums'>
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`}
                    aria-hidden='true'
                  />
                  Cập nhật lúc {new Date(dataUpdatedAt).toLocaleTimeString('vi-VN')}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className='grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end'>
            <div className='space-y-2'>
              <Label htmlFor='seat-board-session' className='text-sm font-medium'>
                Phiên
              </Label>
              <Select value={sessionId} onValueChange={selectSession}>
                <SelectTrigger
                  id='seat-board-session'
                  className='h-11 w-full border-2 hover:border-orange-400 focus:ring-orange-500'
                  aria-label='Chọn phiên'
                >
                  <SelectValue placeholder='Chọn phiên…' />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Phiên</SelectLabel>
                    {sessions.map((session) => (
                      <SelectItem key={session.sessionId} value={String(session.sessionId)}>
                        Phiên {session.session1 ?? session.sessionId}
                        {session.description ? ` · ${session.description}` : ''}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label id='seat-board-side-label' className='text-sm font-medium'>
                Side
              </Label>
              <ToggleGroup
                type='single'
                variant='outline'
                value={side}
                onValueChange={selectSide}
                aria-labelledby='seat-board-side-label'
                className='justify-start'
              >
                {SIDE_OPTIONS.map((option) => (
                  <ToggleGroupItem
                    key={option.value}
                    value={option.value}
                    aria-label={`${option.label} (${option.range})`}
                    className='h-11 gap-2 px-4 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground'
                  >
                    <span className='font-semibold'>{option.label}</span>
                    <span className='text-xs tabular-nums opacity-80'>{option.range}</span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div className='space-y-2'>
              <Label id='seat-board-fullscreen-label' className='text-sm font-medium'>
                Toàn màn hình
              </Label>
              <div role='group' aria-labelledby='seat-board-fullscreen-label' className='flex flex-wrap gap-2'>
                {SCREEN_SIZES.map((size) => (
                  <Button
                    key={size.id}
                    type='button'
                    variant='outline'
                    className='h-11 gap-2 px-4 tabular-nums hover:border-orange-400'
                    aria-label={`Toàn màn hình ${size.width}×${size.height}`}
                    onClick={() => void startFullscreen(size)}
                    disabled={!sessionId}
                  >
                    <Maximize2 className='h-4 w-4' aria-hidden='true' />
                    {size.width}×{size.height}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <p className='text-xs text-muted-foreground'>
            Khi đang toàn màn hình: phím ← chuyển sang bên trái, phím → chuyển sang bên phải, Esc để thoát.
          </p>
        </CardContent>
      </Card>

      {/*
        Màn LED luôn nền trắng cam cố định (không đổi theo dark mode của ứng dụng).
        Trong trang là chế độ quản lý (có MSSV); toàn màn hình là chế độ LED (chỉ mã ghế và tên).
      */}
      <div
        ref={screenRef}
        className={`bg-[#FFF6EA] ${beVietnamPro.className} ${isFullscreen ? 'flex h-screen w-screen items-center justify-center overflow-hidden' : 'rounded-xl border border-orange-200 p-4'}`}
      >
        {!sessionId ? (
          <p className='p-10 text-center text-[#475569]'>Chọn phiên để hiển thị sơ đồ.</p>
        ) : isFullscreen ? (
          // Khung đúng cỡ màn LED, thu/phóng đều (không méo) cho vừa màn đang dùng, 4K cũng chỉ là hệ số lớn hơn.
          <div
            style={{
              width: screenSize.width * stageScale,
              height: screenSize.height * stageScale,
            }}
          >
            <div
              className='origin-top-left'
              style={{
                width: screenSize.width,
                height: screenSize.height,
                padding: stagePadding,
                transform: `scale(${stageScale})`,
              }}
            >
              <SeatingMap
                occupants={occupants}
                side={side}
                mode='led'
                fill
              />
            </div>
          </div>
        ) : (
          <SeatingMap occupants={occupants} side={side} mode='management' />
        )}
      </div>
    </div>
  );
}
