'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Armchair, BellRing, Maximize2, RefreshCw, X } from 'lucide-react';
import { Be_Vietnam_Pro } from 'next/font/google';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { getBachelors } from '@/features/bachelor/api/get-bachelors';
import { findCalling, SEAT_STATE_LABEL, seatState, type SeatOccupant, type SeatSide } from '@/features/led/model/seat-board';
import { fallbackInterval } from '@/lib/realtime/realtime-status';
import { QueueSessionSelect, useStoredSession } from '@/features/led/ui/queue-session-select';
import { SEAT_STYLE, type SeatEntry } from '@/features/led/ui/seating-map/seat-cell';
import { SeatingMap } from '@/features/led/ui/seating-map/seating-map';

// Chỉ áp dụng cho khung sơ đồ này, không đụng đến font chung của ứng dụng (giống sơ đồ đầu giờ).
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['500', '600', '700', '800'],
  display: 'swap',
});

const SIDE_STORAGE_KEY = 'seat-live-side';
const REFRESH_MS = 5000;
const NO_OCCUPANTS: SeatOccupant[] = [];

const SIDE_OPTIONS: { value: SeatSide; label: string; range: string }[] = [
  { value: 'Left', label: 'Bên trái', range: '25–50' },
  { value: 'Right', label: 'Bên phải', range: '01–24' },
];

/** Màu khớp với ô ghế trong sơ đồ (SEAT_STYLE) để chú thích nhìn là hiểu. */
const LEGEND: { label: string; dot: string }[] = [
  { label: 'Chưa check-in', dot: 'border-[#FB7C2E] bg-[#FFDCC4]' },
  { label: 'Đúng giờ', dot: 'border-[#2FBF71] bg-[#D9F6E5]' },
  { label: 'Đến trễ · ngồi ghế cũ', dot: 'border-[#F5A524] bg-[#FFEDBF]' },
  { label: 'Vắng', dot: 'border-[#94A3B8] bg-[#E2E8F0]' },
  { label: 'LED đang gọi', dot: 'border-[#1E3A8A] bg-[#1D4ED8]' },
  { label: 'Sắp gọi (kế tiếp)', dot: 'border-[#7C3AED] bg-[#EDE9FE]' },
];

function readSide(): SeatSide {
  try {
    return window.localStorage.getItem(SIDE_STORAGE_KEY) === 'Right' ? 'Right' : 'Left';
  } catch {
    return 'Left';
  }
}

function storeSide(side: SeatSide) {
  try {
    window.localStorage.setItem(SIDE_STORAGE_KEY, side);
  } catch {
    // Trình duyệt chặn lưu trữ: vẫn dùng bình thường, chỉ không nhớ lựa chọn.
  }
}

/** Chọn bên trái hoặc phải. */
function SideToggle({
  side,
  onChange,
  labelledBy,
}: {
  side: SeatSide;
  onChange: (side: SeatSide) => void;
  labelledBy?: string;
}) {
  return (
    <ToggleGroup
      type='single'
      variant='outline'
      value={side}
      // ToggleGroup trả về '' khi bấm lại mục đang chọn; luôn phải có một bên được chọn.
      onValueChange={(next) => (next === 'Left' || next === 'Right') && onChange(next)}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : 'Chọn bên'}
      className='w-full justify-start md:w-auto'
    >
      {SIDE_OPTIONS.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          aria-label={`${option.label} (${option.range})`}
          className='h-11 flex-1 gap-2 px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground md:flex-none md:px-4'
        >
          <span className='font-semibold'>{option.label}</span>
          <span className='text-xs tabular-nums opacity-80'>{option.range}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** Thanh người LED đang gọi ở bên đang xem, kèm chỗ họ ngồi; vàng nếu người đó đến trễ. */
function CallingBanner({ calling, side }: { calling: ReturnType<typeof findCalling>; side: SeatSide }) {
  if (!calling) return <p className='px-1 text-sm text-[#64748B]'>LED chưa gọi ai ở bên này.</p>;
  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${
        calling.late ? 'border-amber-500/40 bg-amber-500/10' : 'border-blue-500/40 bg-blue-500/10'
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white ${
          calling.late ? 'bg-amber-500' : 'bg-blue-600'
        }`}
      >
        <BellRing className='h-5 w-5' aria-hidden='true' />
      </span>
      <div className='min-w-0 flex-1'>
        <div className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
          LED đang gọi {side === 'Left' ? 'bên trái' : 'bên phải'}
          {calling.late ? ' · đến trễ' : ''}
        </div>
        <div className='truncate text-base font-semibold text-default-900'>
          {calling.fullName}{' '}
          <span className='font-normal tabular-nums text-muted-foreground'>· {calling.studentCode}</span>
        </div>
      </div>
      <Badge
        color={calling.late ? 'warning' : 'info'}
        variant='soft'
        className='gap-1.5 px-3 py-1 text-sm normal-case tabular-nums'
      >
        <Armchair className='h-4 w-4' aria-hidden='true' />
        Ngồi ghế {calling.seat ?? '-'}
      </Badge>
    </div>
  );
}

/** Tên đầy đủ, MSSV, ghế và trạng thái của ô vừa chạm. Màu cố định vì nằm trên nền kem của sơ đồ. */
function SelectedSeatCard({ occupant, onClose }: { occupant: SeatOccupant; onClose: () => void }) {
  const state = seatState(occupant);
  const seat = occupant.originalChair ?? occupant.chair;
  return (
    <div className='flex shrink-0 items-start gap-3 rounded-xl border border-orange-200 bg-white/80 px-4 py-3 text-[#1E293B]'>
      <div className='min-w-0 flex-1'>
        <div className='text-lg font-bold leading-tight'>{occupant.fullName}</div>
        <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#475569]'>
          <span className='tabular-nums'>{occupant.studentCode}</span>
          <span className='font-semibold text-[#1E293B]'>Ghế {seat ?? '-'}</span>
          {occupant.originalChair && <span>số LED {occupant.chair ?? '-'}</span>}
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${SEAT_STYLE[state]}`}>
            {SEAT_STATE_LABEL[state]}
          </span>
          {occupant.statusBaChelor === 'Current' && (
            <span className='rounded-full bg-[#1D4ED8] px-2.5 py-0.5 text-xs font-semibold text-white'>LED đang gọi</span>
          )}
        </div>
      </div>
      <button
        type='button'
        onClick={onClose}
        aria-label='Bỏ chọn'
        className='-mr-1 rounded-md p-1.5 text-[#64748B] hover:bg-orange-100'
      >
        <X className='h-5 w-5' aria-hidden='true' />
      </button>
    </div>
  );
}

/**
 * Thanh trên cùng khi toàn màn hình: một dòng gọn, màu cố định vì nằm trên nền kem của sơ đồ
 * (màu theo giao diện tối sẽ nhạt trên nền sáng).
 */
function FullscreenBar({
  side,
  onChange,
  calling,
}: {
  side: SeatSide;
  onChange: (side: SeatSide) => void;
  calling: ReturnType<typeof findCalling>;
}) {
  return (
    <div className='flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 text-[#1E293B]'>
      <div role='group' aria-label='Chọn bên' className='flex w-full overflow-hidden rounded-full border border-orange-300 bg-white/70 md:inline-flex md:w-auto'>
        {SIDE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type='button'
            aria-pressed={side === option.value}
            onClick={() => onChange(option.value)}
            className={`flex-1 px-4 py-1.5 text-sm font-semibold transition-colors md:flex-none ${
              side === option.value ? 'bg-orange-500 text-white' : 'text-[#7C2D12] hover:bg-orange-100'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className='flex min-w-0 flex-1 items-center gap-3' aria-live='polite'>
        {calling ? (
          <>
            <BellRing className={`h-5 w-5 shrink-0 ${calling.late ? 'text-amber-500' : 'text-blue-600'}`} aria-hidden='true' />
            <span className='min-w-0 truncate text-base font-semibold'>
              {calling.fullName} <span className='font-normal tabular-nums text-[#64748B]'>· {calling.studentCode}</span>
            </span>
            <span
              className={`shrink-0 rounded-full border px-3 py-0.5 text-sm font-semibold tabular-nums ${
                calling.late
                  ? 'border-[#F5A524] bg-[#FFEDBF] text-[#6B4200]'
                  : 'border-[#93C5FD] bg-[#DBEAFE] text-[#1E3A8A]'
              }`}
            >
              Ngồi ghế {calling.seat ?? '-'}
              {calling.late ? ' · đến trễ' : ''}
            </span>
          </>
        ) : (
          <span className='text-sm text-[#64748B]'>LED chưa gọi ai ở bên này.</span>
        )}
      </div>

      <span className='hidden text-xs text-[#94A3B8] md:inline'>Esc để thoát</span>
    </div>
  );
}

/**
 * Sơ đồ ghế trực tiếp cho điều phối: ai đã check-in, ai đến trễ (hiện ở ô ghế cũ, vì họ vẫn ngồi đó),
 * và ô của người LED đang gọi được khoanh xanh để biết ngay đi dẫn ai ở đâu.
 */
export default function SeatLivePage() {
  const { value, select, sessionId } = useStoredSession('seat-live-session');
  const [side, setSide] = useState<SeatSide>('Left');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const screenRef = useRef<HTMLDivElement>(null);

  useEffect(() => setSide(readSide()), []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === screenRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Chạm lại cùng ô thì bỏ chọn. Hàm ổn định để các ô không vẽ lại mỗi lần làm mới.
  const toggleSelected = useCallback((occupant: SeatEntry) => {
    setSelectedCode((current) => (current === occupant.studentCode ? null : occupant.studentCode));
  }, []);

  const changeSide = (next: SeatSide) => {
    setSide(next);
    storeSide(next);
  };

  // Đang toàn màn hình: phím ← / → đổi bên, Esc để thoát (trình duyệt tự xử lý Esc).
  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const next: SeatSide | null =
        event.key === 'ArrowLeft' ? 'Left' : event.key === 'ArrowRight' ? 'Right' : null;
      if (!next) return;
      event.preventDefault();
      setSide(next);
      storeSide(next);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreen]);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await screenRef.current?.requestFullscreen();
    } catch {
      // Trình duyệt từ chối toàn màn hình (ví dụ iframe không cho phép): giữ nguyên giao diện.
    }
  };

  const { data, isError, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['led', 'seat-live', sessionId],
    queryFn: () => getBachelors({ pageIndex: 1, pageSize: 2000, session: String(sessionId) }),
    enabled: sessionId !== null,
    refetchInterval: fallbackInterval(REFRESH_MS),
    refetchOnWindowFocus: true,
  });

  const occupants: SeatOccupant[] = data?.items ?? NO_OCCUPANTS;
  const calling = findCalling(occupants, side);
  const selectedOccupant = selectedCode ? occupants.find((item) => item.studentCode === selectedCode) : undefined;

  return (
    <div className='space-y-4'>
      <Card className='relative overflow-hidden'>
        {/* Dải màu nhấn thương hiệu, cùng kiểu với sơ đồ đầu giờ */}
        <div className='absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500' />
        <CardContent className='space-y-4 p-4 pt-5'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='flex items-center gap-3'>
              <span className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                <Armchair className='h-5 w-5' aria-hidden='true' />
              </span>
              <div>
                <h1 className='text-xl font-semibold tracking-tight text-default-900'>Sơ đồ ghế trực tiếp</h1>
                <p className='text-sm text-muted-foreground'>
                  Người đến trễ hiện ở ghế cũ. Ô xanh đậm là người LED đang gọi, ô tím là người kế tiếp. Tự cập nhật ngay khi có thay đổi.
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
                  <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} aria-hidden='true' />
                  Cập nhật lúc {new Date(dataUpdatedAt).toLocaleTimeString('vi-VN')}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className='grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end'>
            <QueueSessionSelect
              id='seat-live-session'
              value={value}
              onChange={select}
              triggerClassName='border-2 hover:border-orange-400 focus:ring-orange-500'
            />
            <div className='space-y-2'>
              <Label id='seat-live-side-label' className='text-sm font-medium'>
                Side
              </Label>
              <SideToggle side={side} onChange={changeSide} labelledBy='seat-live-side-label' />
            </div>
            <div className='space-y-2'>
              <Label className='text-sm font-medium'>Toàn màn hình</Label>
              <Button
                type='button'
                variant='outline'
                className='h-11 w-full gap-2 px-4 hover:border-orange-400 md:w-auto'
                onClick={() => void toggleFullscreen()}
                disabled={sessionId === null}
              >
                <Maximize2 className='h-4 w-4' aria-hidden='true' />
                Toàn màn hình
              </Button>
            </div>
          </div>

          <ul className='flex flex-wrap gap-2' aria-label='Chú thích màu'>
            {LEGEND.map((entry) => (
              <li
                key={entry.label}
                className='inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground'
              >
                <span className={`h-3 w-3 rounded-[3px] border-2 ${entry.dot}`} aria-hidden='true' />
                {entry.label}
              </li>
            ))}
          </ul>
          <p className='hidden text-xs text-muted-foreground md:block'>
            Bấm vào ô để xem tên đầy đủ. Khi đang toàn màn hình: phím ← chuyển sang bên trái, phím → chuyển sang bên phải, Esc để thoát.
          </p>
          <p className='text-xs text-muted-foreground md:hidden'>Vuốt ngang để xem hết sơ đồ, chạm vào ô để xem tên đầy đủ.</p>
        </CardContent>
      </Card>

      {/* Ngoài toàn màn hình, thanh "đang gọi" nằm riêng phía trên sơ đồ; khi toàn màn hình nó nằm trong khung để vẫn thấy */}
      {sessionId !== null && !isFullscreen && (
        <div aria-live='polite'>
          <CallingBanner calling={calling} side={side} />
        </div>
      )}

      {/* Sơ đồ luôn nền trắng cam cố định như màn LED, không đổi theo dark mode của ứng dụng */}
      <div
        ref={screenRef}
        className={`bg-[#FFF6EA] ${beVietnamPro.className} ${
          isFullscreen
            ? 'flex h-screen w-screen flex-col gap-3 overflow-hidden p-4'
            : 'rounded-xl border border-orange-200 p-4'
        }`}
      >
        {isFullscreen && <FullscreenBar side={side} onChange={changeSide} calling={calling} />}
        {selectedOccupant && <SelectedSeatCard occupant={selectedOccupant} onClose={() => setSelectedCode(null)} />}

        {sessionId === null ? (
          <p className='p-10 text-center text-[#475569]'>Chọn phiên để hiển thị sơ đồ.</p>
        ) : (
          <div className={`overflow-x-auto ${isFullscreen ? 'flex min-h-0 flex-1 flex-col' : ''}`}>
            <div className={`min-w-[1200px] xl:min-w-0 ${isFullscreen ? 'flex min-h-0 flex-1 flex-col' : ''}`}>
              <SeatingMap
                occupants={occupants}
                side={side}
                mode='management'
                useOriginalSeat
                showCalling
                fill={isFullscreen}
                hideHeader={isFullscreen}
                selectedCode={selectedCode}
                onSelectSeat={toggleSelected}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
