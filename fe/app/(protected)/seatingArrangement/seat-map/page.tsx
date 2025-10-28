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
import { useQuery } from '@tanstack/react-query';
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
} from 'lucide-react';
import { checkinAPI } from '@/config/axios';
import HallSessionPicker from '@/components/hallSessionPicker';

// ====== Cấu hình lưới ======
const SEATS_PER_SIDE = 70;
const COLS = 6;

// Chỉ hiển thị tên (lấy từ cuối)
const getGivenName = (full?: string | null) => {
  if (!full) return '';
  const parts = full.trim().split(/\s+/);
  return parts.length ? parts[parts.length - 1] : full;
};

type SeatCellProps = {
  label: string;
  occupant?: Bachelor | null;
  variant: 'student' | 'parent' | 'empty';
  showDetails?: boolean;
  oneLine?: boolean;
};

function SeatCell({
  label,
  occupant,
  variant,
  showDetails = false,
  oneLine = false,
}: SeatCellProps) {
  const [isHovered, setIsHovered] = useState(false);

  const base =
    'relative flex items-center justify-center rounded-lg text-[10px] sm:text-xs border select-none h-10 sm:h-12 p-1.5 text-center transition-all duration-300 ease-out cursor-default';

  const color =
    variant === 'student'
      ? occupant
        ? 'bg-gradient-to-br from-rose-100 to-rose-200 border-rose-300 text-rose-900 shadow-sm hover:shadow-md hover:scale-105'
        : 'bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200 text-rose-600 hover:border-rose-300'
      : variant === 'parent'
      ? occupant
        ? 'bg-gradient-to-br from-sky-100 to-sky-200 border-sky-300 text-sky-900 shadow-sm hover:shadow-md hover:scale-105'
        : 'bg-gradient-to-br from-sky-50 to-sky-100/50 border-sky-200 text-sky-600 hover:border-sky-300'
      : 'bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-200 text-gray-500';

  const details = occupant
    ? `${label} - ${occupant.fullName} - ${occupant.studentCode}`
    : label;

  const statusDot = occupant && !showDetails && (
    <span
      className={`absolute right-1 top-1 h-2 w-2 rounded-full ${
        occupant.checkIn ? 'bg-emerald-600' : 'bg-rose-500'
      }`}
    />
  );

  const statusIcon =
    occupant &&
    showDetails &&
    (occupant.checkIn ? (
      <CheckCircle2 className='absolute right-1.5 top-1.5 w-4 h-4 text-emerald-600' />
    ) : (
      <XCircle className='absolute right-1.5 top-1.5 w-4 h-4 text-rose-600' />
    ));

  return (
    <div
      className={`${base} ${color} ${
        showDetails ? 'h-20 sm:h-28 text-[11px] sm:text-sm' : ''
      } ${occupant ? 'ring-1 ring-inset ring-white/40' : ''}`}
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
            oneLine ? 'flex-row whitespace-nowrap' : 'flex-wrap',
          ].join(' ')}
        >
          <span className='shrink-0'>{label}</span>
          {occupant ? (
            <>
              <span className='truncate max-w-[140px] sm:max-w-[160px]'>
                {getGivenName(occupant.fullName)}
              </span>
              <span className='opacity-80 shrink-0'>
                {occupant.studentCode}
              </span>
            </>
          ) : (
            <span className='opacity-60'>Trống</span>
          )}
        </div>
      ) : (
        <div className='flex flex-col items-center gap-0.5'>
          <span className='font-bold'>{label}</span>
          {occupant && isHovered && (
            <div className='text-[8px] opacity-80 font-medium truncate max-w-full'>
              {occupant.fullName?.split(' ').pop()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SeatMapPage() {
  // ==== Nhận lựa chọn từ HallSessionPicker ====
  const [hall, setHall] = useState<string>('');
  const [session, setSession] = useState<string>('');
  const [selectedHallName, setSelectedHallName] = useState<string>('');

  // ==== Hiển thị ====
  const [showFullInfo, setShowFullInfo] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // ==== Fetch danh sách ghế theo Hall/Session ====
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
    if (listErr) {
      toast.error('Lỗi khi tải danh sách chỗ ngồi');
    }
  }, [listErr]);

  const bachelors: Bachelor[] = useMemo(() => {
    const raw = listRes?.data;
    const extract = (r: any): any[] => {
      if (!r) return [];
      if (Array.isArray(r?.data?.data?.items)) return r.data.data.items;
      if (Array.isArray(r?.data?.items)) return r.data.items;
      if (Array.isArray(r?.data)) return r.data;
      return [];
    };
    return extract(listRes);
  }, [listRes]);

  const studentMap = useMemo(() => {
    const map = new Map<number, Bachelor>();
    for (const b of bachelors) {
      const n = parseInt(String(b.chair ?? '').replace(/[^0-9]/g, ''));
      if (!isNaN(n) && n >= 1 && n <= SEATS_PER_SIDE) map.set(n, b);
    }
    return map;
  }, [bachelors]);

  const parentMap = useMemo(() => {
    const map = new Map<number, Bachelor>();
    for (const b of bachelors) {
      const raw = String(b.chairParent ?? '');
      const n = parseInt(raw.replace(/[^0-9]/g, ''));
      if (!isNaN(n) && n >= 1 && n <= SEATS_PER_SIDE) map.set(n, b);
    }
    return map;
  }, [bachelors]);

  // Xác định Hall B để hoán đổi nhãn/dãy
  const isHallB = useMemo(() => {
    const name = (selectedHallName || '').toString();
    const n = name.trim().toLowerCase();
    return /(^|\s)b($|\s)/i.test(name) || n.endsWith(' b');
  }, [selectedHallName]);

  // ==== Theo dõi fullscreen + resize (ESC đồng bộ layout) ====
  useEffect(() => {
    const updateDims = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    const handleFull = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      setShowFullInfo(isFull);
      if (isFull) {
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
      } else {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
      }
      updateDims();
    };
    const handleResize = () => updateDims();

    document.addEventListener('fullscreenchange', handleFull);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('fullscreenchange', handleFull);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // ==== Kích thước ghế cơ sở (trước khi scale) ====
  const seatSize = useMemo(() => {
    if (!isFullscreen || !dimensions.width || !dimensions.height) {
      return { width: 56, height: 48, gap: 8, fontSize: 'xs' as const };
    }
    const rows = Math.ceil(SEATS_PER_SIDE / COLS);
    const middleWidthFS = Math.max(
      140,
      Math.min(240, Math.floor(dimensions.width * 0.06))
    );
    const availableWidth = (dimensions.width - middleWidthFS) / 2;
    const availableHeight = dimensions.height - 48;

    const maxWidthPerSeat = (availableWidth - (COLS - 1) * 10) / COLS;
    const maxHeightPerSeat = (availableHeight - (rows - 1) * 10) / rows;

    const size = Math.min(maxWidthPerSeat, maxHeightPerSeat, 130);
    return {
      width: Math.floor(size),
      height: Math.floor(size * 1.12),
      gap: size > 100 ? 12 : 10,
      fontSize:
        size > 96
          ? ('base' as const)
          : size > 80
          ? ('sm' as const)
          : ('xs' as const),
    };
  }, [isFullscreen, dimensions]);

  // ==== Tính kích thước bố cục & scale-to-fit (ưu tiên sát 2 lề ngang) ====
  const scaleData = useMemo(() => {
    const rows = Math.ceil(SEATS_PER_SIDE / COLS);
    const sideWidth = COLS * seatSize.width + (COLS - 1) * seatSize.gap;
    const middleWidth = isFullscreen
      ? Math.max(140, Math.min(240, Math.floor(dimensions.width * 0.06)))
      : 200;

    // >>> CHUẨN: 2 dãy + lối giữa
    const contentWidth = sideWidth * 3.5 + middleWidth;
    const gridsHeight = rows * seatSize.height + (rows - 1) * seatSize.gap;
    const contentHeight = gridsHeight + (isFullscreen ? 32 : 96);

    let scale = 1;
    if (isFullscreen && dimensions.width && dimensions.height) {
      const sx = dimensions.width / contentWidth; // ép sát trái/phải
      const sy = dimensions.height / contentHeight;
      scale = Math.min(sx, sy);
      scale = Math.min(scale, 1.25);
    }
    return { contentWidth, contentHeight, middleWidth, scale };
  }, [seatSize, isFullscreen, dimensions]);

  const enterFull = async () => {
    try {
      setShowFullInfo(true);
      await containerRef.current?.requestFullscreen?.();
      // overflow sẽ do fullscreenchange xử lý
    } catch {}
  };

  const exitFull = async () => {
    try {
      await document.exitFullscreen();
    } catch {}
    // fullscreenchange sẽ đồng bộ lại state
  };

  // style lưới theo seatSize (trước khi scale)
  const gridSeatStyle = {
    gridTemplateColumns: `repeat(${COLS}, minmax(${
      isFullscreen || showFullInfo ? Math.max(seatSize.width, 44) : 48
    }px, 1fr))`,
    gap: isFullscreen || showFullInfo ? Math.max(seatSize.gap, 8) : 8,
  } as React.CSSProperties;

  const HeaderLabel = ({ type }: { type: 'left' | 'right' }) => {
    const leftIsStudent = isHallB; // Hall B: bên trái là Tân cử nhân
    const rightIsStudent = !isHallB;

    const showStudent =
      (type === 'left' && leftIsStudent) ||
      (type === 'right' && rightIsStudent);

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

  const stats = useMemo(() => {
    const totalStudents = studentMap.size;
    const totalParents = parentMap.size;
    return { totalStudents, totalParents };
  }, [studentMap, parentMap]);

  return (
    <div className='space-y-5 pb-8'>
      {/* Breadcrumb cam */}
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

      {/* Picker tái sử dụng (cam) */}
      <HallSessionPicker
        storageKey='seatmap'
        onChange={(v) => {
          setHall(v.hallId);
          setSession(v.sessionId);
          setSelectedHallName(v.hallName || '');
        }}
      />

      {/* Thống kê nhanh */}
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

      {/* Seat map */}
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
              {/* Khối vẽ, scale-to-fit để chạm lề trái/phải */}
              <div
                className={isFullscreen ? '' : 'mx-auto'}
                style={
                  isFullscreen
                    ? {
                        width: '100vw',
                        height: '100vh',
                        padding: 0,
                        margin: 0,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'flex-start',
                      }
                    : {
                        maxWidth: showFullInfo
                          ? 'min(1600px, calc(100vw - 48px))'
                          : 1200,
                      }
                }
              >
                <div
                  style={
                    isFullscreen
                      ? {
                          width: `${scaleData.contentWidth}px`,
                          height: `${scaleData.contentHeight}px`,
                          transform: `scale(${scaleData.scale})`,
                          transformOrigin: 'top center',
                        }
                      : undefined
                  }
                >
                  {/* Header: label trái | tiêu đề | label phải + nút */}
                  <div
                    className='grid items-center mb-2 mt-2'
                    style={{
                      gridTemplateColumns: `1fr ${scaleData.middleWidth}px 1fr`,
                      gap: isFullscreen ? 16 : 20,
                    }}
                  >
                    {/* Label trái */}
                    <div className='flex items-center gap-2'>
                      <HeaderLabel type='left' />
                    </div>

                    {/* Giữa: tiêu đề nhỏ */}
                    <div className='flex items-center justify-center'>
                      <div className='bg-gradient-to-b from-orange-600 to-amber-600 text-white text-center px-4 py-2 rounded-xl font-bold shadow-lg'>
                        SƠ ĐỒ HỘI TRƯỜNG
                      </div>
                    </div>

                    {/* Label phải + Nút */}
                    <div className='flex items-center justify-end gap-2'>
                      <HeaderLabel type='right' />
                      {isFullscreen ? (
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={exitFull}
                          className='shadow-sm'
                        >
                          <Minimize2 className='w-4 h-4 mr-2' />
                          Thoát toàn màn hình
                        </Button>
                      ) : (
                        <Button
                          size='sm'
                          onClick={enterFull}
                          disabled={!enabled}
                          className='bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-sm'
                        >
                          <Maximize2 className='w-4 h-4 mr-2' />
                          Toàn màn hình
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 3 cột ghế: trái | lối giữa (trống) | phải */}
                  <div
                    className='grid items-start'
                    style={{
                      gridTemplateColumns: `1fr ${scaleData.middleWidth}px 1fr`,
                      gap: isFullscreen ? 16 : 20,
                    }}
                  >
                    {/* Trái */}
                    <div className='grid' style={gridSeatStyle}>
                      {Array.from(
                        { length: SEATS_PER_SIDE },
                        (_, i) => i + 1
                      ).map((n) =>
                        isHallB ? (
                          <SeatCell
                            key={`left-s-${n}`}
                            label={`${n}`}
                            occupant={studentMap.get(n) || null}
                            variant='student'
                            showDetails={showFullInfo}
                            oneLine={isFullscreen}
                          />
                        ) : (
                          <SeatCell
                            key={`left-p-${n}`}
                            label={`PH${n}`}
                            occupant={parentMap.get(n) || null}
                            variant='parent'
                            showDetails={showFullInfo}
                            oneLine={isFullscreen}
                          />
                        )
                      )}
                    </div>

                    {/* Lối giữa (trống để chiếm chỗ) */}
                    <div />

                    {/* Phải */}
                    <div className='grid' style={gridSeatStyle}>
                      {Array.from(
                        { length: SEATS_PER_SIDE },
                        (_, i) => i + 1
                      ).map((n) =>
                        isHallB ? (
                          <SeatCell
                            key={`right-p-${n}`}
                            label={`PH${n}`}
                            occupant={parentMap.get(n) || null}
                            variant='parent'
                            showDetails={showFullInfo}
                            oneLine={isFullscreen}
                          />
                        ) : (
                          <SeatCell
                            key={`right-s-${n}`}
                            label={`${n}`}
                            occupant={studentMap.get(n) || null}
                            variant='student'
                            showDetails={showFullInfo}
                            oneLine={isFullscreen}
                          />
                        )
                      )}
                    </div>
                  </div>

                  {!showFullInfo && (
                    <div className='mt-3 p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200'>
                      <p className='text-sm text-gray-700 text-center'>
                        💡 <span className='font-semibold'>Mẹo:</span> Di chuột
                        vào ghế để xem tên tân cử nhân
                      </p>
                    </div>
                  )}
                </div>
              </div>
              {/* Hết khối vẽ */}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
