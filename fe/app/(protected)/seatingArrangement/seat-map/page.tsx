'use client';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Bachelor } from '@/dtos/BachelorDTO';
import {
  Maximize2,
  Minimize2,
  Users,
  User,
  Camera,
  CheckCircle2,
  XCircle,
  CornerDownRight,
  Bell,
  ArrowRight,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import { checkinAPI, notificationAPI, type CreateNotificationRequest } from '@/config/axios';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import HallSessionPicker from '@/components/hallSessionPicker';

/* =========================
   1) Layout + Marker + BLOCK CONFIG
   ========================= */

type RowCol = { row: number; col: number }; // 0-based trong lưới

type HallLayout = {
  seatsPerSide: number; // số ghế mỗi dãy (student/parent)
  cols: number; // số cột
  markers: {
    checkinTopPct: number;
    cameraPct: number;
    stageEntrancePct: number;
  };
};

const HALL_LAYOUTS: Record<'A' | 'B', HallLayout> = {
  A: {
    seatsPerSide: 70,
    cols: 6,
    markers: { checkinTopPct: 5, cameraPct: 48, stageEntrancePct: 92 },
  },
  B: {
    seatsPerSide: 60,
    cols: 5,
    markers: { checkinTopPct: 6, cameraPct: 50, stageEntrancePct: 90 },
  },
};

/**
 * GHẾ BLOCK sau khi chuẩn hoá:
 * - SV luôn ngồi BÊN PHẢI (cả Hall A & B) → không block dãy SV
 * - BÊN TRÁI là dãy PH:
 *    + Hall A: thêm 1 hàng block đầu (X hết)
 *    + Hall B: thêm 1 hàng block đầu, trong đó 2 ô đầu là ghế thật PH26 & PH27,
 *      và phủ X tại vị trí gốc PH26/27 trong lưới chính.
 */
const BLOCKS = {
  A: {
    extraRows: { student: 1, parent: 1 },
    overlayParentByNumber: [] as ReadonlyArray<number>,
    overlayParentByRowCol: [] as ReadonlyArray<RowCol>,
    parentTopRowSeatNumbers: [] as ReadonlyArray<number>,
  },
  B: {
    extraRows: { student: 1, parent: 1 },
    overlayParentByNumber: [26, 27] as const,
    overlayParentByRowCol: [] as ReadonlyArray<RowCol>,
    parentTopRowSeatNumbers: [26, 27] as const,
  },
} as const;

const parseHallSymbol = (name?: string) => {
  const n = (name || '').trim().toUpperCase();
  if (/\bA\b/.test(n) || /HALL\s*A\b/.test(n) || n.endsWith(' A'))
    return 'A' as const;
  if (/\bB\b/.test(n) || /HALL\s*B\b/.test(n) || n.endsWith(' B'))
    return 'B' as const;
  return 'A' as const;
};

const rcToSeat = (row: number, col: number, cols: number) =>
  row * cols + col + 1;

/* =========================
   2) Helpers & SeatCell
   ========================= */

const getGivenName = (full?: string | null) => {
  if (!full) return '';
  const parts = full.trim().split(/\s+/);
  if (!parts.length) return '';
  const last = parts[parts.length - 1];
  const initials = parts
    .slice(0, -1)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
  return `${last}${initials}`;
};

type SeatCellProps = {
  label: string;
  occupant?: Bachelor | null;
  variant: 'student' | 'parent';
  blockedOverlay?: boolean;
  showDetails?: boolean;
  oneLine?: boolean;
  seatHeight?: number;
  onNotify?: (occupant: Bachelor) => void;
  notifyDisabled?: boolean;
};

function SeatCell({
  label,
  occupant,
  variant,
  blockedOverlay = false,
  showDetails = false,
  oneLine = false,
  seatHeight,
  onNotify,
  notifyDisabled,
}: SeatCellProps) {
  const [isHovered, setIsHovered] = useState(false);

  const base =
    'relative flex items-center justify-center rounded-lg text-[10px] sm:text-xs border select-none p-1.5 text-center transition-all';
  const tone =
    variant === 'student'
      ? 'bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200 text-rose-700'
      : 'bg-gradient-to-br from-sky-50 to-sky-100/50 border-sky-200 text-sky-700';

  const ring =
    occupant && !blockedOverlay ? 'ring-1 ring-inset ring-white/40' : '';
  const interactive =
    occupant && !blockedOverlay
      ? 'shadow-sm hover:shadow-md hover:scale-105'
      : 'cursor-default';

  const details = blockedOverlay
    ? `Khu vực không ngồi – ${label}`
    : occupant
    ? `${label} - ${occupant.fullName} - ${occupant.studentCode}`
    : label;

  const statusDot = occupant && !showDetails && !blockedOverlay && (
    <span
      className={`absolute right-1 top-1 h-2 w-2 rounded-full ${
        occupant.checkIn ? 'bg-emerald-600' : 'bg-rose-500'
      }`}
    />
  );

  const statusIcon =
    occupant &&
    showDetails &&
    !blockedOverlay &&
    (occupant.checkIn ? (
      <CheckCircle2 className='absolute right-1.5 top-1.5 w-4 h-4 text-emerald-600' />
    ) : (
      <XCircle className='absolute right-1.5 top-1.5 w-4 h-4 text-rose-600' />
    ));

  const inlineStyle: React.CSSProperties = seatHeight
    ? { height: seatHeight }
    : {};

  const content = (
    <div
      className={`${base} ${tone} ${ring} ${interactive} ${
        showDetails ? 'text-[11px] sm:text-sm' : ''
      }`}
      style={inlineStyle}
      title={details}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {statusDot}
      {statusIcon}

      {showDetails ? (
        <div
          className={[
            'leading-tight font-semibold flex items-center justify-center gap-1 sm:gap-2 text-center',
            oneLine ? 'flex-col whitespace-nowrap' : 'flex-wrap',
          ].join(' ')}
        >
          <span className='shrink-0'>
            {label}
            <br />
          </span>
          {occupant && !blockedOverlay ? (
            <span>
              <span className='truncate max-w-[140px] sm:max-w-[160px]'>
                {getGivenName(occupant.fullName)}{' '}
              </span>
              <span className='opacity-80 shrink-0'>
                {occupant.studentCode}
              </span>
            </span>
          ) : (
            <span className='opacity-60'>
              {blockedOverlay ? 'KHÔNG NGỒI' : 'Trống'}
            </span>
          )}
        </div>
      ) : (
        <div className='flex flex-col items-center gap-0.5'>
          <span className='font-bold'>{label}</span>
          {occupant && !blockedOverlay && isHovered && (
            <div className='text-[8px] opacity-80 font-medium truncate max-w-full'>
              {occupant.fullName?.split(' ').pop()}
            </div>
          )}
        </div>
      )}

      {blockedOverlay && (
        <>
          <div className='pointer-events-none absolute inset-0 rounded-lg bg-gray-300/25' />
          <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
            <span className='text-[14px] sm:text-base font-extrabold text-gray-700/85 tracking-wider'>
              X
            </span>
          </div>
        </>
      )}

    </div>
  );

  const canContextMenu =
    occupant &&
    variant === 'student' &&
    !blockedOverlay &&
    !occupant.checkIn &&
    !!onNotify;

  if (!canContextMenu) return content;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{content}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={(e) => {
            e.preventDefault();
            onNotify?.(occupant!);
          }}
          disabled={!!notifyDisabled}
        >
          <Bell className='h-4 w-4 mr-2' /> Gửi thông báo
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function BlockRow({
  cols,
  tone,
  seatHeight,
}: {
  cols: number;
  tone: 'student' | 'parent';
  seatHeight?: number;
}) {
  const base =
    'relative flex items-center justify-center rounded-lg text-[10px] sm:text-xs border select-none p-1.5 text-center';
  const color =
    tone === 'student'
      ? 'bg-gradient-to-br from-rose-100 to-rose-200/80 border-rose-300 text-rose-900'
      : 'bg-gradient-to-br from-sky-100 to-sky-200/80 border-sky-300 text-sky-900';

  const cellStyle: React.CSSProperties = seatHeight
    ? { height: seatHeight }
    : {};

  return (
    <div
      className='grid'
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(44px, 1fr))`,
        gap: 8,
      }}
    >
      {Array.from({ length: cols }).map((_, i) => (
        <div
          key={i}
          className={`${base} ${color} cursor-not-allowed`}
          style={cellStyle}
          title='Khu vực không ngồi'
        >
          <span className='font-bold'>X</span>
        </div>
      ))}
    </div>
  );
}

function ParentTopBlockRow({
  cols,
  seatNumbers,
  parentMap,
  showDetails,
  oneLine,
  seatHeight,
}: {
  cols: number;
  seatNumbers: ReadonlyArray<number>;
  parentMap: Map<number, Bachelor>;
  showDetails: boolean;
  oneLine: boolean;
  seatHeight?: number;
}) {
  const xStyle: React.CSSProperties = seatHeight ? { height: seatHeight } : {};
  return (
    <div
      className='grid'
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(44px, 1fr))`,
        gap: 8,
      }}
    >
      {Array.from({ length: cols }).map((_, i) => {
        const seatNo = seatNumbers[i];
        if (seatNo) {
          const occ = parentMap.get(seatNo) || null;
          return (
            <SeatCell
              key={`ptop-${seatNo}`}
              label={`PH${seatNo}`}
              occupant={occ}
              variant='parent'
              blockedOverlay={false}
              showDetails={showDetails}
              oneLine={oneLine}
              seatHeight={seatHeight}
            />
          );
        }
        return (
          <div
            key={`ptop-x-${i}`}
            className='relative flex items-center justify-center rounded-lg border p-1.5 text-center cursor-not-allowed
                       bg-gradient-to-br from-sky-100 to-sky-200/80 border-sky-300 text-sky-900'
            style={xStyle}
            title='Khu vực không ngồi'
          >
            <span className='font-bold'>X</span>
          </div>
        );
      })}
    </div>
  );
}

/* =========================
   3) Middle marker (để sẵn)
   ========================= */
/* =========================
   MARKERS (edge/overlay)
   ========================= */
type Tone = 'amber' | 'sky' | 'rose' | 'slate';

const toneClass: Record<Tone, string> = {
  amber: 'bg-amber-50/95 border-amber-300 text-amber-900 shadow-amber-100',
  sky: 'bg-sky-50/95 border-sky-300 text-sky-900 shadow-sky-100',
  rose: 'bg-rose-50/95 border-rose-300 text-rose-900 shadow-rose-100',
  slate: 'bg-white/90 border-slate-300 text-slate-900 shadow-slate-100',
};

function Pill({
  children,
  tone = 'slate',
  className = '',
  vertical = false,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
  vertical?: boolean;
}) {
  return (
    <div
      className={[
        'flex items-center justify-center gap-2 px-3 py-1.5 rounded-md border shadow-sm backdrop-blur',
        toneClass[tone],
        vertical ? 'writing-vertical' : '',
        className,
      ].join(' ')}
    >
      {children}
      <style jsx>{`
        .writing-vertical {
          writing-mode: vertical-rl;
          text-orientation: mixed;
        }
      `}</style>
    </div>
  );
}

/** Marker định vị tuyệt đối theo % hoặc px */
function PositionedMarker({
  children,
  style,
  className = '',
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={['pointer-events-none absolute', className].join(' ')}
      style={style}
    >
      {children}
    </div>
  );
}

/** Bộ Marker tổng hợp theo hall */
function Markers({
  hallSymbol,
  isFullscreen,
}: {
  hallSymbol: 'A' | 'B';
  isFullscreen: boolean;
}) {
  // tỷ lệ/offset cho fullscreen & normal
  const rightEdge = isFullscreen ? '2vw' : '12px';
  const leftEdge = isFullscreen ? '2vw' : '12px';
  const topEdge = isFullscreen ? '6vh' : '36px';
  const bottomEdge = isFullscreen ? '4vh' : '24px';
  const midY = isFullscreen ? '35vh' : '35%';

  return (
    <>
      {/* === Chung cho cả A & B === */}

      {/* Lối lên nhận bằng (mũi tên ↑), text dọc ở lề phải */}
      <PositionedMarker style={{ top: midY as any, right: rightEdge }}>
        <Pill tone='rose' vertical>
          <ArrowUp className='w-4 h-4' />
          <span className='font-semibold'>LỐI LÊN NHẬN BẰNG</span>
        </Pill>
      </PositionedMarker>

      {/* Lối trở về chỗ ngồi (mũi tên ↓) ở lề trái */}
      <PositionedMarker style={{ top: midY as any, left: leftEdge }}>
        <Pill tone='sky' vertical>
          <ArrowDown className='w-4 h-4' />
          <span className='font-semibold'>LỐI TRỞ VỀ CHỖ NGỒI</span>
        </Pill>
      </PositionedMarker>

      {/* Lối trở về chỗ ngồi ở CUỐI HÀNG GHẾ, mũi tên → (trừ trái qua phải) */}
      <PositionedMarker
        style={{ bottom: bottomEdge, left: isFullscreen ? '10vw' : '10%' }}
      >
        <Pill tone='sky'>
          <ArrowRight className='w-4 h-4' />
          <span className='font-semibold'>LỐI TRỞ VỀ CHỖ NGỒI</span>
        </Pill>
      </PositionedMarker>

      {/* Ở khoảng trống giữa (lối đi ở giữa hai dãy) */}
      <PositionedMarker
        style={{
          top: isFullscreen ? '40vh' : '40%',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        <Pill tone='slate' vertical>
          <span className='font-semibold'>KHÔNG ĐI LỐI NÀY</span>
        </Pill>
      </PositionedMarker>

      {/* === Riêng Hall A === */}
      {hallSymbol === 'A' && (
        <>
          {/* Lối ra lầu 4 ở trên bên trái */}
          <PositionedMarker style={{ top: topEdge, left: leftEdge }}>
            <Pill tone='amber'>
              <span className='font-semibold'>LỐI RA LẦU 4</span>
            </Pill>
          </PositionedMarker>

          {/* Cuối hàng: CHECK-IN & LỐI VÀO LẦU 5 */}
          <PositionedMarker
            style={{ bottom: bottomEdge, right: isFullscreen ? '10vw' : '10%' }}
          >
            <Pill tone='rose'>
              <span className='font-semibold'>
                CHECK-IN &nbsp;•&nbsp; LỐI VÀO LẦU 5
              </span>
            </Pill>
          </PositionedMarker>
        </>
      )}

      {/* === Riêng Hall B === */}
      {hallSymbol === 'B' && (
        <>
          {/* Lối vào & Check-in lầu 4 ở góc dưới phải */}
          <PositionedMarker style={{ bottom: bottomEdge, right: rightEdge }}>
            <Pill tone='rose'>
              <span className='font-semibold'>
                LỐI VÀO &amp; CHECK-IN (LẦU 4)
              </span>
            </Pill>
          </PositionedMarker>

          {/* Lối ra ở trên hàng đầu, lề phải: Lối ra lầu 3 */}
          <PositionedMarker style={{ top: topEdge, right: rightEdge }}>
            <Pill tone='amber'>
              <span className='font-semibold'>LỐI RA (LẦU 3)</span>
            </Pill>
          </PositionedMarker>
        </>
      )}
    </>
  );
}

/* =========================
   4) Main
   ========================= */
export default function SeatMapPage() {
  const [hall, setHall] = useState<string>('');
  const [session, setSession] = useState<string>('');
  const [selectedHallName, setSelectedHallName] = useState<string>('');

  const [showFullInfo, setShowFullInfo] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const hallSymbol = useMemo(
    () => parseHallSymbol(selectedHallName),
    [selectedHallName]
  );
  const layout = useMemo(() => HALL_LAYOUTS[hallSymbol], [hallSymbol]);
  const SEATS_PER_SIDE = layout.seatsPerSide;
  const COLS = layout.cols;

  const cfg = BLOCKS[hallSymbol];
  const enabled = !!hall && !!session;

  const {
    data: listRes,
    isFetching,
    error: listErr,
  } = useQuery({
    queryKey: ['seat-map', hall, session],
    queryFn: () =>
      checkinAPI.getBachelorList({
        pageIndex: 1,
        pageSize: 1000,
        hall,
        session,
      }),
    enabled,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (listErr) toast.error('Lỗi khi tải danh sách chỗ ngồi');
  }, [listErr]);

  const bachelors: Bachelor[] = useMemo(() => {
    const r = listRes as any;
    if (!r) return [];
    if (Array.isArray(r?.data?.data?.items)) return r.data.data.items;
    if (Array.isArray(r?.data?.items)) return r.data.items;
    if (Array.isArray(r?.data)) return r.data;
    return [];
  }, [listRes]);

  const studentMap = useMemo(() => {
    const map = new Map<number, Bachelor>();
    for (const b of bachelors) {
      const n = parseInt(String(b.chair ?? '').replace(/[^0-9]/g, ''));
      if (!isNaN(n) && n >= 1 && n <= SEATS_PER_SIDE) map.set(n, b);
    }
    return map;
  }, [bachelors, SEATS_PER_SIDE]);

  const parentBlockedOverlaySet = useMemo(() => {
    const set = new Set<number>();
    cfg.overlayParentByNumber.forEach((n) => {
      if (n >= 1 && n <= SEATS_PER_SIDE) set.add(n);
    });
    cfg.overlayParentByRowCol.forEach(({ row, col }) => {
      const n = rcToSeat(row, col, COLS);
      if (n >= 1 && n <= SEATS_PER_SIDE) set.add(n);
    });
    return set;
  }, [cfg, COLS, SEATS_PER_SIDE]);

  const parentMap = useMemo(() => {
    const map = new Map<number, Bachelor>();
    for (const b of bachelors) {
      const n = parseInt(String(b.chairParent ?? '').replace(/[^0-9]/g, ''));
      if (!isNaN(n) && n >= 1 && n <= SEATS_PER_SIDE) map.set(n, b);
    }
    return map;
  }, [bachelors, SEATS_PER_SIDE]);

  // ---- Notify action (like ManualCheckinPage)
  const sendNotifyMutation = useMutation({
    mutationFn: async (payload: { message: string }) => {
      const req: CreateNotificationRequest = {
        title: 'Thông báo hội trường',
        content: payload.message,
        priority: 2,
        isAutomatic: false,
        repeatCount: 1,
      };
      return notificationAPI.create(req);
    },
    onSuccess: (res) => {
      toast.success(res?.data?.message ?? 'Đã gửi thông báo!', {
        duration: 3000,
        position: 'top-right',
      });
    },
    onError: (err: any) => {
      toast.error(
        'Gửi thông báo thất bại: ' +
          (err?.response?.data?.message || err?.message || 'Lỗi không xác định'),
        { duration: 4000, position: 'top-right' }
      );
    },
  });

  const handleSendNotify = (b: Bachelor) => {
    const hallLabel = b.hallName && b.hallName !== '' ? b.hallName : selectedHallName || 'hội trường';
    const message = `Xin mời Tân cử nhân ${b.fullName} với mã số sinh viên ${b.studentCode} tới hội trường ${hallLabel} thuộc phiên ${b.sessionNum} để làm thủ tục checkin trước khi cổng checkin đóng lại.`;
    sendNotifyMutation.mutate({ message });
  };

  useEffect(() => {
    const upd = () => {
      if (!containerRef.current) return;
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    };
    const onFull = () => {
      const full = !!document.fullscreenElement;
      setIsFullscreen(full);
      setShowFullInfo(full);
      document.documentElement.style.overflow = full ? 'hidden' : '';
      document.body.style.overflow = full ? 'hidden' : '';
      upd();
    };
    document.addEventListener('fullscreenchange', onFull);
    window.addEventListener('resize', upd);
    return () => {
      document.removeEventListener('fullscreenchange', onFull);
      window.removeEventListener('resize', upd);
    };
  }, []);

  /**
   * TÍNH KÍCH THƯỚC GHẾ
   * - Normal mode: như cũ (dựa theo container width/height)
   * - Fullscreen: bám đúng 40vw (bề rộng mỗi dãy) và 80vh (chiều cao)
   */
  const seatSize = useMemo(() => {
    if (!isFullscreen || !dimensions.width || !dimensions.height) {
      return { width: 56, height: 20, gap: 8, fontSize: 'xs' as const };
    }
    const aw = dimensions.width * 0.425; // mỗi dãy chiếm 42.5% width
    const ah = dimensions.height * 0.9; // chiều cao 90%

    const rows = Math.ceil(SEATS_PER_SIDE / COLS);
    const maxW = (aw - (COLS - 1) * 10) / COLS;
    const maxH = (ah - (rows - 1) * 10) / rows;
    const size = Math.min(maxW, maxH, 130);
    return {
      width: Math.floor(size),
      height: Math.floor(size * 0.8),
      gap: size > 100 ? 12 : 10,
      fontSize:
        size > 96
          ? ('base' as const)
          : size > 80
          ? ('sm' as const)
          : ('xs' as const),
    };
  }, [isFullscreen, dimensions, SEATS_PER_SIDE, COLS]);

  // Chiều cao cell (áp dụng FS để đồng nhất block & seat)
  const cellHeight = useMemo(() => {
    const h = Math.max(seatSize.height, 30);
    return isFullscreen ? h : undefined;
  }, [seatSize.height, isFullscreen]);

  // (Only Normal mode) scale wrapper như cũ
  const scaleData = useMemo(() => {
    if (isFullscreen) {
      return {
        contentWidth: 0,
        contentHeight: 0,
        middleWidth: 0,
        scale: 1,
        gridsHeight: 0,
      };
    }
    const rows = Math.ceil(SEATS_PER_SIDE / COLS);
    const sideW = COLS * seatSize.width + (COLS - 1) * seatSize.gap;
    const middleW = 200;
    const contentWidth = sideW * 3.5 + middleW;
    const gridsHeight = rows * seatSize.height + (rows - 1) * seatSize.gap;
    const contentHeight = gridsHeight + 96;
    return {
      contentWidth,
      contentHeight,
      middleWidth: middleW,
      scale: 1,
      gridsHeight,
    };
  }, [isFullscreen, seatSize, SEATS_PER_SIDE, COLS]);

  const enterFull = async () => {
    try {
      setShowFullInfo(true);
      await containerRef.current?.requestFullscreen?.();
    } catch {}
  };
  const exitFull = async () => {
    try {
      await document.exitFullscreen();
    } catch {}
  };

  const gridSeatStyle = useMemo(() => {
    const minCell =
      isFullscreen || showFullInfo ? Math.max(seatSize.width, 44) : 48;
    const gap = isFullscreen || showFullInfo ? Math.max(seatSize.gap, 8) : 8;
    return {
      gridTemplateColumns: `repeat(${COLS}, minmax(${minCell}px, 1fr))`,
      gap,
    } as React.CSSProperties;
  }, [COLS, isFullscreen, showFullInfo, seatSize.width, seatSize.gap]);

  const HeaderLabel = ({ type }: { type: 'left' | 'right' }) => {
    const showStudent = type === 'right';
    return showStudent ? (
      <div className='flex items-center gap-2'>
        <User className='w-5 h-5 text-rose-600' />
        <span className='text-sm font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-200'>
          Dãy Tân cử nhân
        </span>
      </div>
    ) : (
      <div className='flex items-center gap-2'>
        <Users className='w-5 h-5 text-sky-600' />
        <span className='text-sm font-bold text-sky-700 bg-sky-50 px-3 py-1.5 rounded-full border border-sky-200'>
          Dãy Phụ huynh
        </span>
      </div>
    );
  };

  const stats = useMemo(
    () => ({ totalStudents: studentMap.size, totalParents: parentMap.size }),
    [studentMap, parentMap]
  );

  /* ---------- RENDER ---------- */
  return (
    <div className='space-y-5 pb-8'>
      <Card className='shadow-sm border-0 '>
        <CardContent className='p-4'>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href='/'
                  className='hover:text-orange-600 transition-colors'
                >
                  Trang chủ
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className='font-semibold'>
                  Sơ đồ chỗ ngồi
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </CardContent>
      </Card>

      <HallSessionPicker
        storageKey='seatmap'
        onChange={(v) => {
          setHall(v.hallId);
          setSession(v.sessionId);
          setSelectedHallName(v.hallName || '');
        }}
      />

      {enabled && !isFetching && (
        <div className='flex gap-4 flex-wrap'>
          <div className='flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-50 to-rose-100 rounded-lg border border-rose-200'>
            <User className='w-4 h-4 text-rose-600' />
            <span className='text-sm font-semibold text-rose-900'>
              {stats.totalStudents} tân cử nhân
            </span>
          </div>
          <div className='flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-200'>
            <Users className='w-4 h-4 text-amber-600' />
            <span className='text-sm font-semibold text-amber-900'>
              {stats.totalParents} phụ huynh
            </span>
          </div>
        </div>
      )}

      <Card className='shadow-lg border-0'>
        <CardContent className='p-6'>
          {!enabled ? (
            <div className='flex flex-col items-center justify-center py-16 px-4'>
              <div className='w-16 h-16 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center mb-4'>
                <Camera className='w-8 h-8 text-orange-500' />
              </div>
              <p className='text-base text-gray-600 text-center'>
                Vui lòng chọn hội trường và session để hiển thị sơ đồ chỗ ngồi
              </p>
            </div>
          ) : isFetching ? (
            <div className='flex flex-col items-center justify-center py-16'>
              <div className='loader mb-4' />
              <p className='text-sm text-gray-500'>Đang tải sơ đồ...</p>
            </div>
          ) : (
            <div
              ref={containerRef}
              className={
                isFullscreen
                  ? 'w-screen h-screen overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50'
                  : 'w-full overflow-auto'
              }
            >
              {/* ========= FULLSCREEN LAYOUT (20vh header + 80vh content) ========= */}
              {isFullscreen ? (
                <div className='w-screen h-screen'>
                  {/* Header 20vh, 100vw */}
                  <div
                    className='flex items-center justify-between px-[5vw]'
                    style={{ height: '10vh', width: '100vw' }}
                  >
                    <div>
                      {/* giữ cân đối, placeholder bên trái */}
                      <HeaderLabel type='left' />
                    </div>

                    <div className='flex items-center justify-center'>
                      <div className='bg-gradient-to-b from-orange-600 to-amber-600 text-white text-center px-6 py-3 rounded-xl font-bold shadow-lg'>
                        SƠ ĐỒ HỘI TRƯỜNG {hallSymbol}
                      </div>
                    </div>

                    <div className='flex items-center gap-2'>
                      <HeaderLabel type='right' />
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={exitFull}
                        className='shadow-sm'
                      >
                        <Minimize2 className='w-4 h-4 mr-2' />
                        Thoát toàn màn hình
                      </Button>
                    </div>
                  </div>

                  {/* Content 80vh:
                      [5vw margin] [40vw PH] [10vw gap] [40vw SV] [5vw margin] */}
                  <div
                    className='grid'
                    style={{
                      gridTemplateColumns: '5vw 42.5vw 5vw 42.5vw 5vw',

                      columnGap: 0,
                      height: '90vh',
                      width: '100vw',
                    }}
                  >
                    {/* margin trái */}
                    <div />

                    {/* PH 40vw × 80vh */}
                    <div className='flex flex-col h-full'>
                      {cfg.extraRows.parent > 0 &&
                        (hallSymbol === 'B' ? (
                          <ParentTopBlockRow
                            cols={COLS}
                            seatNumbers={cfg.parentTopRowSeatNumbers}
                            parentMap={parentMap}
                            showDetails={showFullInfo}
                            oneLine={true}
                            seatHeight={cellHeight}
                          />
                        ) : (
                          <BlockRow
                            cols={COLS}
                            tone='parent'
                            seatHeight={cellHeight}
                          />
                        ))}
                      <div
                        className='grid mt-2'
                        style={{
                          ...gridSeatStyle,
                          height: '100%',
                          alignContent: 'start',
                        }}
                      >
                        {Array.from(
                          { length: SEATS_PER_SIDE },
                          (_, i) => i + 1
                        ).map((n) => {
                          const label = `PH${n}`;
                          const blockedOverlay = parentBlockedOverlaySet.has(n);
                          const occ = parentMap.get(n);
                          return (
                            <SeatCell
                              key={`left-p-${n}`}
                              label={label}
                              occupant={occ || null}
                              variant='parent'
                              blockedOverlay={blockedOverlay}
                              showDetails={showFullInfo}
                              oneLine={true}
                              seatHeight={cellHeight}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* GAP giữa 10vw */}
                    <div className='relative'>
                      {/* có thể thả MiddleMarker nếu muốn */}
                    </div>

                    {/* SV 40vw × 80vh */}
                    <div className='flex flex-col h-full'>
                      {cfg.extraRows.student > 0 && (
                        <BlockRow
                          cols={COLS}
                          tone='student'
                          seatHeight={cellHeight}
                        />
                      )}
                      <div
                        className='grid mt-2'
                        style={{
                          ...gridSeatStyle,
                          height: '100%',
                          alignContent: 'start',
                        }}
                      >
                        {Array.from(
                          { length: SEATS_PER_SIDE },
                          (_, i) => i + 1
                        ).map((n) => {
                          const label = `${n}`;
                          const occ = studentMap.get(n);
                          return (
                            <SeatCell
                              key={`right-s-${n}`}
                              label={label}
                              occupant={occ || null}
                              variant='student'
                              blockedOverlay={false}
                              showDetails={showFullInfo}
                              oneLine={true}
                              seatHeight={cellHeight}
                              onNotify={occ && !occ.checkIn ? handleSendNotify : undefined}
                              notifyDisabled={sendNotifyMutation.isPending}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* margin phải */}
                    <div />
                  </div>
                  <Markers hallSymbol={hallSymbol} isFullscreen={false} />
                </div>
              ) : (
                /* ========= NORMAL LAYOUT (giữ như cũ) ========= */
                <div
                  className='mx-auto'
                  style={{
                    maxWidth: showFullInfo
                      ? 'min(1600px, calc(100vw - 48px))'
                      : 1200,
                  }}
                >
                  <div>
                    {/* Header */}
                    <div
                      className='grid items-center mb-2 mt-2'
                      style={{
                        gridTemplateColumns: `1fr ${scaleData.middleWidth}px 1fr`,
                        gap: 20,
                      }}
                    >
                      <div className='flex items-center gap-2'>
                        <HeaderLabel type='left' />
                      </div>
                      <div className='flex items-center justify-center'>
                        <div className='bg-gradient-to-b from-orange-600 to-amber-600 text-white text-center px-4 py-2 rounded-xl font-bold shadow-lg'>
                          SƠ ĐỒ HỘI TRƯỜNG {hallSymbol}
                        </div>
                      </div>
                      <div className='flex items-center justify-end gap-2'>
                        <HeaderLabel type='right' />
                        <Button
                          size='sm'
                          onClick={enterFull}
                          disabled={!enabled}
                          className='bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-sm'
                        >
                          <Maximize2 className='w-4 h-4 mr-2' />
                          Toàn màn hình
                        </Button>
                      </div>
                    </div>

                    {/* 3 cột: Trái | Lối giữa | Phải */}
                    <div
                      className='grid items-start'
                      style={{ gridTemplateColumns: `1fr 200px 1fr`, gap: 20 }}
                    >
                      {/* TRÁI = PH */}
                      <div className='flex flex-col gap-2'>
                        {cfg.extraRows.parent > 0 &&
                          (hallSymbol === 'B' ? (
                            <ParentTopBlockRow
                              cols={COLS}
                              seatNumbers={cfg.parentTopRowSeatNumbers}
                              parentMap={parentMap}
                              showDetails={showFullInfo}
                              oneLine={false}
                              seatHeight={cellHeight}
                            />
                          ) : (
                            <BlockRow
                              cols={COLS}
                              tone='parent'
                              seatHeight={cellHeight}
                            />
                          ))}
                        <div className='grid' style={gridSeatStyle}>
                          {Array.from(
                            { length: SEATS_PER_SIDE },
                            (_, i) => i + 1
                          ).map((n) => {
                            const label = `PH${n}`;
                            const blockedOverlay =
                              parentBlockedOverlaySet.has(n);
                            const occ = parentMap.get(n);
                            return (
                              <SeatCell
                                key={`left-p-${n}`}
                                label={label}
                                occupant={occ || null}
                                variant='parent'
                                blockedOverlay={blockedOverlay}
                                showDetails={showFullInfo}
                                oneLine={false}
                                seatHeight={cellHeight}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* LỐI GIỮA */}
                      <div
                        className='relative rounded-lg'
                        style={{
                          background:
                            'linear-gradient(to bottom, rgba(255,200,100,0.06), rgba(255,220,120,0.06))',
                          border: '1px dashed rgba(253,186,116,0.6)',
                        }}
                      />

                      {/* PHẢI = SV */}
                      <div className='flex flex-col gap-2'>
                        {cfg.extraRows.student > 0 && (
                          <BlockRow
                            cols={COLS}
                            tone='student'
                            seatHeight={cellHeight}
                          />
                        )}
                        <div className='grid' style={gridSeatStyle}>
                          {Array.from(
                            { length: SEATS_PER_SIDE },
                            (_, i) => i + 1
                          ).map((n) => {
                            const occ = studentMap.get(n);
                            return (
                              <SeatCell
                                key={`right-s-${n}`}
                                label={`${n}`}
                                occupant={occ || null}
                                variant='student'
                                blockedOverlay={false}
                                showDetails={showFullInfo}
                                oneLine={false}
                                seatHeight={cellHeight}
                                onNotify={occ && !occ.checkIn ? handleSendNotify : undefined}
                                notifyDisabled={sendNotifyMutation.isPending}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
