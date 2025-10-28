'use client';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ledAPI, checkinAPI } from '@/config/axios';
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
  Sparkles,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

const SEATS_PER_SIDE = 72;
const COLS = 6;

// Chỉ hiển thị tên (lấy từ cuối cùng)
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
};

function SeatCell({
  label,
  occupant,
  variant,
  showDetails = false,
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
      {/* Trạng thái checkin: luôn hiển thị (dot ở compact, icon ở detail) */}
      {statusDot}
      {statusIcon}

      {showDetails ? (
        <div className='leading-tight font-semibold flex items-center justify-center gap-2 flex-wrap text-center'>
          <span>{label}</span>
          {occupant ? (
            <>
              <span className='truncate max-w-[140px]'>
                {getGivenName(occupant.fullName)}
              </span>
              <span className='opacity-80'>{occupant.studentCode}</span>
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
  const [hall, setHall] = useState<string>('');
  const [session, setSession] = useState<string>('');
  const [showFullInfo, setShowFullInfo] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const { data: hallList, error: hallErr } = useQuery({
    queryKey: ['hallList'],
    queryFn: () => ledAPI.getHallList(),
    staleTime: 5 * 60 * 1000,
  });
  const { data: sessionList } = useQuery({
    queryKey: ['sessionList'],
    queryFn: () => ledAPI.getSessionList(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (hallErr) {
      toast.error('Lỗi khi lấy danh sách hội trường', {
        duration: 4000,
        position: 'top-right',
      });
    }
  }, [hallErr]);

  const enabled = !!hall && !!session;

  const { data: listRes, isFetching } = useQuery({
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

  const selectedHall = useMemo(() => {
    const list = hallList?.data?.data || [];
    return list.find((h: any) => String(h.hallId) === String(hall));
  }, [hall, hallList]);

  const isHallB = useMemo(() => {
    const name: string = (selectedHall?.hallName || '').toString();
    const n = name.trim().toLowerCase();
    return /(^|\s)b($|\s)/i.test(name) || n.endsWith(' b');
  }, [selectedHall]);

  const stats = useMemo(() => {
    const totalStudents = studentMap.size;
    const totalParents = parentMap.size;
    return { totalStudents, totalParents };
  }, [studentMap, parentMap]);

  // Cập nhật kích thước khi vào/ra fullscreen và khi resize
  useEffect(() => {
    const handleFull = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    document.addEventListener('fullscreenchange', handleFull);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('fullscreenchange', handleFull);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Tính kích thước ghế theo viewport (đảm bảo khít màn ở fullscreen)
  const seatSize = useMemo(() => {
    if (!isFullscreen || !dimensions.width || !dimensions.height) {
      return { width: 56, height: 48, gap: 8, fontSize: 'xs' };
    }
    const rows = Math.ceil(SEATS_PER_SIDE / COLS);
    const middleWidth = 200;
    const header = 120;

    const availableWidth = (dimensions.width - middleWidth) / 2;
    const availableHeight = dimensions.height - header;

    const maxWidthPerSeat = (availableWidth - (COLS - 1) * 16) / COLS;
    const maxHeightPerSeat = (availableHeight - (rows - 1) * 16) / rows;

    const size = Math.min(maxWidthPerSeat, maxHeightPerSeat, 140);

    return {
      width: Math.floor(size),
      height: Math.floor(size * 1.2),
      gap: size > 100 ? 16 : 12,
      fontSize: size > 100 ? 'base' : size > 80 ? 'sm' : 'xs',
    };
  }, [isFullscreen, dimensions]);

  const enterFull = async () => {
    try {
      setShowFullInfo(true);
      await containerRef.current?.requestFullscreen?.();
      // khoá cuộn body khi fullscreen
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } catch {}
  };

  const exitFull = async () => {
    try {
      await document.exitFullscreen();
    } catch {}
    setShowFullInfo(false);
    // mở lại cuộn body
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  };

  // style lưới theo seatSize
  const gridSeatStyle = {
    gridTemplateColumns: `repeat(${COLS}, minmax(${
      isFullscreen || showFullInfo ? Math.max(seatSize.width, 48) : 48
    }px, 1fr))`,
    gap: isFullscreen || showFullInfo ? Math.max(seatSize.gap, 8) : 8,
  } as React.CSSProperties;

  return (
    <div className='space-y-5 pb-8'>
      {/* Breadcrumb */}
      <Card className='shadow-sm border-0 bg-gradient-to-r from-blue-50 to-purple-50'>
        <CardContent className='p-4'>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href='/'
                  className='hover:text-blue-600 transition-colors'
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

      {/* Selection Card */}
      <Card className='shadow-lg border-0 overflow-hidden'>
        <div className='absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500'></div>
        <CardHeader className='pb-3 bg-gradient-to-br from-slate-50 to-slate-100/50'>
          <CardTitle className='text-lg flex items-center gap-2'>
            <Sparkles className='w-5 h-5 text-purple-500' />
            Chọn hội trường và session
          </CardTitle>
        </CardHeader>
        <CardContent className='p-5'>
          <div className='flex gap-3 flex-wrap items-center'>
            <Select onValueChange={setHall}>
              <SelectTrigger className='w-[240px] border-2 hover:border-blue-400 transition-colors'>
                <SelectValue placeholder='🏛️ Chọn hội trường' />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Hội trường</SelectLabel>
                  {Array.isArray(hallList?.data?.data) &&
                    hallList.data.data.map((h: any) => (
                      <SelectItem key={h.hallId} value={String(h.hallId)}>
                        {h.hallName}
                      </SelectItem>
                    ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select onValueChange={setSession}>
              <SelectTrigger className='w-[240px] border-2 hover:border-purple-400 transition-colors'>
                <SelectValue placeholder='📅 Chọn session' />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Session</SelectLabel>
                  {Array.isArray(sessionList?.data?.data) &&
                    sessionList.data.data.map((s: any) => (
                      <SelectItem key={s.sessionId} value={String(s.sessionId)}>
                        {s.session1}
                      </SelectItem>
                    ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Button
              disabled={!enabled}
              onClick={enterFull}
              variant='default'
              className='bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md transition-all duration-300 hover:shadow-lg'
            >
              <Maximize2 className='w-4 h-4 mr-2' />
              Toàn màn hình
            </Button>
          </div>

          {/* Stats */}
          {enabled && !isFetching && (
            <div className='mt-4 flex gap-4 flex-wrap'>
              <div className='flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-50 to-rose-100 rounded-lg border border-rose-200'>
                <User className='w-4 h-4 text-rose-600' />
                <span className='text-sm font-semibold text-rose-900'>
                  {stats.totalStudents} tân cử nhân
                </span>
              </div>
              <div className='flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-50 to-sky-100 rounded-lg border border-sky-200'>
                <Users className='w-4 h-4 text-sky-600' />
                <span className='text-sm font-semibold text-sky-900'>
                  {stats.totalParents} phụ huynh
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seat map */}
      <Card className='shadow-lg border-0'>
        <CardContent className='p-6'>
          {!enabled ? (
            <div className='flex flex-col items-center justify-center py-16 px-4'>
              <div className='w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-4'>
                <Sparkles className='w-8 h-8 text-purple-500' />
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
                  ? 'w-screen h-screen overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-amber-100'
                  : 'w-full overflow-auto'
              }
            >
              {isFullscreen && (
                <div className='flex justify-end p-4'>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={exitFull}
                    className='shadow-md hover:shadow-lg transition-all'
                  >
                    <Minimize2 className='w-4 h-4 mr-2' />
                    Thoát toàn màn hình
                  </Button>
                </div>
              )}

              <div
                className={`mx-auto ${isFullscreen ? 'px-6' : ''}`}
                style={{
                  width: isFullscreen ? '100vw' : undefined,
                  maxWidth: isFullscreen
                    ? '100vw'
                    : showFullInfo
                    ? 'min(1600px, calc(100vw - 48px))'
                    : 1200,
                }}
              >
                {/* Wrapper 3 cột: Trái (dãy), Giữa (máy quay), Phải (dãy) */}
                <div className='grid grid-cols-[1fr_auto_1fr] gap-6 items-start'>
                  {/* Left side */}
                  <div className='space-y-3'>
                    <div className='flex items-center gap-2 mb-3'>
                      {isHallB ? (
                        <>
                          <User className='w-5 h-5 text-rose-600' />
                          <span className='text-sm font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-200'>
                            Dãy Tân cử nhân
                          </span>
                        </>
                      ) : (
                        <>
                          <Users className='w-5 h-5 text-sky-600' />
                          <span className='text-sm font-bold text-sky-700 bg-sky-50 px-3 py-1.5 rounded-full border border-sky-200'>
                            Dãy Phụ huynh
                          </span>
                        </>
                      )}
                    </div>

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
                          />
                        ) : (
                          <SeatCell
                            key={`left-p-${n}`}
                            label={`PH${n}`}
                            occupant={parentMap.get(n) || null}
                            variant='parent'
                            showDetails={showFullInfo}
                          />
                        )
                      )}
                    </div>
                  </div>

                  {/* Middle aisle */}
                  <div className='flex flex-col items-center justify-start pt-11 h-full'>
                    <div className='bg-gradient-to-b from-red-600 to-red-700 text-white text-center px-5 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 sticky top-0'>
                      <Camera className='w-5 h-5' />
                      <span className='text-sm'>MÁY QUAY</span>
                    </div>
                  </div>

                  {/* Right side */}
                  <div className='space-y-3'>
                    <div className='flex items-center gap-2 mb-3'>
                      {isHallB ? (
                        <>
                          <Users className='w-5 h-5 text-sky-600' />
                          <span className='text-sm font-bold text-sky-700 bg-sky-50 px-3 py-1.5 rounded-full border border-sky-200'>
                            Dãy Phụ huynh
                          </span>
                        </>
                      ) : (
                        <>
                          <User className='w-5 h-5 text-rose-600' />
                          <span className='text-sm font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-200'>
                            Dãy Tân cử nhân
                          </span>
                        </>
                      )}
                    </div>

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
                          />
                        ) : (
                          <SeatCell
                            key={`right-s-${n}`}
                            label={`${n}`}
                            occupant={studentMap.get(n) || null}
                            variant='student'
                            showDetails={showFullInfo}
                          />
                        )
                      )}
                    </div>
                  </div>
                </div>

                {!showFullInfo && (
                  <div className='mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200'>
                    <p className='text-sm text-gray-700 text-center'>
                      💡 <span className='font-semibold'>Mẹo:</span> Di chuột
                      vào ghế để xem tên tân cử nhân
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
