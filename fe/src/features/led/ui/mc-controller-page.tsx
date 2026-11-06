'use client';

import HallSessionPicker from '@/features/session/ui/hall-session-picker';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  getCurrentLedBachelors,
  getInitialLedBachelors,
  getNextLedBachelors,
  getPreviousLedBachelors,
} from '@/features/led/api/get-led-bachelors';
import { hallQueryOptions } from '@/features/hall/queries/hall-query-options';
import { sessionQueryOptions } from '@/features/session/queries/session-query-options';
import { Bachelor } from '@/features/bachelor/model/bachelor';
import type { LedBachelorWindow } from '@/features/led/model/led-bachelors';
import { describeLateBanner, isFirstLateNext, isLateBachelor } from '@/features/led/model/late-highlight';
import {
  FONT_SCALE_DEFAULT,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  readStoredNumber,
  scaledRem,
  SPLIT_DEFAULT,
  SPLIT_KEY_STEP,
  SPLIT_MAX,
  SPLIT_MIN,
  clampSplit,
  splitFromPointer,
  stepFontScale,
} from '@/features/led/model/mc-layout';
import { Icon } from '@iconify/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from '@/lib/toast';
import { getHttpErrorMessage } from '@/lib/http/get-http-error-message';
import { jumpLedQueue } from '@/features/led/api/get-led-queue';
import { InlineModal } from '@/features/led/ui/inline-modal';
import { LedJumpPanel } from '@/features/led/ui/led-jump-panel';
import {
  ArrowLeftRight,
  ChevronsLeft,
  Clock,
  Search,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
} from 'lucide-react';

/** Viền vàng quanh cả khung (kể cả toàn màn hình) khi người đang chiếu đến trễ. */
const LATE_FRAME = 'border-4 border-amber-500 dark:border-amber-500';
/** Viền vàng của thẻ "Tiếp theo" khi đó là người đến trễ đầu tiên (hover không được đổi lại màu cam). */
const NEXT_LATE_BORDER =
  'border-4 border-amber-500 dark:border-amber-500 hover:border-amber-500 dark:hover:border-amber-500';

// ====== Helpers cho ảnh ======
const isValidImageSrc = (src?: string | null) => {
  if (!src || typeof src !== 'string') return false;
  const trimmed = src.trim();
  if (trimmed.length < 2) return false;
  if (trimmed.startsWith('data:')) return false;

  try {
    const u = new URL(trimmed);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return trimmed.startsWith('/');
  }
};

function SafeImg({
  src,
  alt,
  width,
  height,
  className,
}: {
  src?: string | null;
  alt: string;
  width: number;
  height: number;
  className?: string;
}) {
  if (!isValidImageSrc(src)) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${
          className || ''
        }`}
      ></div>
    );
  }
  return (
    <div className='relative bg-black'>
      <Image
        src={src as string}
        alt={alt}
        width={width}
        height={height}
        unoptimized
        className={`bg-black transition-opacity duration-300 ${className}`}
        onError={(e) => {
          const el = e.currentTarget as HTMLImageElement;
          el.style.opacity = '0'; // thay vì display: none
        }}
        onLoad={(e) => {
          const el = e.currentTarget as HTMLImageElement;
          el.style.opacity = '1';
        }}
      />
    </div>
  );
}

export default function McControllerPage() {
  const [hall, setHall] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem('hall') || '';
  });
  const [session, setSession] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem('session') || '';
  });

  const [showPrevious, setShowPrevious] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = window.localStorage.getItem('showPrevious');
    return stored === null ? true : stored === 'true';
  });

  // Đổi chỗ hai thẻ cho tiện nhìn: "Hiện tại" sang trái, "Tiếp theo" sang phải. Chỉ đổi cách bày, không đổi dữ liệu.
  const [swapCurrentNext, setSwapCurrentNext] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('swapCurrentNext') === 'true';
  });

  // Cỡ chữ thông tin tân cử nhân và tỉ lệ bề rộng hai thẻ (kéo thanh giữa), đều được nhớ trong trình duyệt.
  const [fontScale, setFontScale] = useState<number>(() => {
    if (typeof window === 'undefined') return FONT_SCALE_DEFAULT;
    return readStoredNumber(window.localStorage.getItem('mcFontScale'), FONT_SCALE_DEFAULT, FONT_SCALE_MIN, FONT_SCALE_MAX);
  });
  const [split, setSplit] = useState<number>(() => {
    if (typeof window === 'undefined') return SPLIT_DEFAULT;
    return readStoredNumber(window.localStorage.getItem('mcSplit'), SPLIT_DEFAULT, SPLIT_MIN, SPLIT_MAX);
  });
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  // Khung nổi đang mở: chọn người để chuyển tới, hoặc xác nhận về đầu.
  const [panel, setPanel] = useState<'jump' | 'first' | null>(null);
  const pairRef = React.useRef<HTMLDivElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const controlRef = React.useRef<HTMLDivElement>(null);

  const [bachelorCurrent, setBachelorCurrent] = useState<Bachelor | null>(null);
  const [bachelorBack, setBachelorBack] = useState<Bachelor | null>(null);
  const [bachelorNext, setBachelorNext] = useState<Bachelor | null>(null);
  const [navigationCooldown, setNavigationCooldown] = useState(0);

  // ---- Fetch hall
  const { data: hallData, error: hallError } = useQuery(hallQueryOptions);

  const hallList = useMemo(
    () =>
      (hallData ?? []).map((item) => ({
        value: String(item.hallId),
        label: item.hallName,
      })),
    [hallData]
  );

  useEffect(() => {
    if (hallError) {
      toast.error('Lỗi lấy danh sách side', {
        duration: 3000,
        position: 'top-right',
      });
    }
  }, [hallError]);

  // ---- Fetch session
  const { data: sessionData, error: sessionError } =
    useQuery(sessionQueryOptions);

  const sessionList = useMemo(
    () =>
      (sessionData ?? []).map((item) => ({
        value: String(item.sessionId),
        label: String(item.session1 ?? item.sessionId),
      })),
    [sessionData]
  );

  useEffect(() => {
    if (sessionError) {
      toast.error('Lỗi lấy danh sách session', {
        duration: 3000,
        position: 'top-right',
      });
    }
  }, [sessionError]);

  // ---- Persist lựa chọn
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const h = window.localStorage.getItem('hall');
    const s = window.localStorage.getItem('session');
    if (s) setSession(s);
    if (h) setHall(h);
  }, []);

  useEffect(() => {
    if (!hall || typeof window === 'undefined') return;
    window.localStorage.setItem('hall', hall);
  }, [hall]);

  useEffect(() => {
    if (!session || typeof window === 'undefined') return;
    window.localStorage.setItem('session', session);
  }, [session]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('showPrevious', String(showPrevious));
  }, [showPrevious]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('swapCurrentNext', String(swapCurrentNext));
  }, [swapCurrentNext]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('mcFontScale', String(fontScale));
  }, [fontScale]);

  useEffect(() => {
    // Chỉ lưu khi thả chuột, không ghi liên tục lúc đang kéo.
    if (typeof window === 'undefined' || isDraggingSplit) return;
    window.localStorage.setItem('mcSplit', String(split));
  }, [split, isDraggingSplit]);

  useEffect(() => {
    if (navigationCooldown <= 0) return;

    const intervalId = window.setInterval(() => {
      setNavigationCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [navigationCooldown]);

  const hallLabel = useMemo(() => {
    return (
      hallList.find((item) => item.value.toString() === hall.toString())
        ?.label || 'Chưa chọn'
    );
  }, [hallList, hall]);

  const sessionLabel = useMemo(() => {
    return (
      sessionList.find((item) => item.value.toString() === session.toString())
        ?.label || 'Chưa chọn'
    );
  }, [sessionList, session]);

  // ---- Fullscreen handlers
  const toggleFullscreen = async () => {
    // isFullscreen do listener 'fullscreenchange' cập nhật, nên nếu trình duyệt từ chối thì giao diện không bị lệch.
    try {
      if (!document.fullscreenElement && controlRef.current) {
        await controlRef.current.requestFullscreen();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      toast.error('Trình duyệt không cho vào chế độ toàn màn hình', { duration: 3000 });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const applyBachelorWindow = useCallback((payload?: LedBachelorWindow) => {
    if (!payload) {
      setBachelorBack(null);
      setBachelorCurrent(null);
      setBachelorNext(null);
      return;
    }

    setBachelorBack(payload.bachelor1);
    setBachelorCurrent(payload.bachelor2 || null);
    setBachelorNext(payload.bachelor3);
  }, []);

  const startNavigationCooldown = useCallback(() => {
    setNavigationCooldown(3);
  }, []);

  // ---- Mutations
  const getBachelorCurrent = useMutation({
    mutationFn: async () => {
      if (!hall || !session) {
        throw new Error('Chưa chọn side hoặc session');
      }
      return getCurrentLedBachelors(hall, session);
    },
    onSuccess: (data) => {
      applyBachelorWindow(data);
    },
    onError: () => {
      toast.error('Có lỗi khi lấy dữ liệu. Vui lòng chọn side/session khác!', {
        duration: 3000,
        position: 'top-right',
      });
    },
  });

  const getBachelor1st = useMutation({
    mutationFn: async () => {
      if (!hall || !session) {
        throw new Error('Chưa chọn side hoặc session');
      }
      return getInitialLedBachelors(hall, session);
    },
    onSuccess: () => {
      getBachelorCurrent.mutate();
    },
    onError: () => {
      toast.error('Có lỗi khi lấy dữ liệu. Vui lòng chọn side/session khác!', {
        duration: 3000,
      });
      setBachelorCurrent(null);
      setBachelorBack(null);
      setBachelorNext(null);
    },
  });

  const getBachelorNext = useMutation({
    mutationFn: async () => {
      if (!hall || !session) {
        throw new Error('Chưa chọn side hoặc session');
      }
      return getNextLedBachelors(hall, session);
    },
    onSuccess: () => {
      getBachelorCurrent.mutate();
    },
    onError: () => {
      toast.error('Lỗi khi lấy dữ liệu', { duration: 3000 });
    },
  });

  const getBachelorBack = useMutation({
    mutationFn: async () => {
      if (!hall || !session) {
        throw new Error('Chưa chọn side hoặc session');
      }
      return getPreviousLedBachelors(hall, session);
    },
    onSuccess: () => {
      getBachelorCurrent.mutate();
    },
    onError: () => {
      toast.error('Lỗi khi lấy dữ liệu', { duration: 3000 });
    },
  });

  // MC nhảy tới một người trong hàng đợi (về đầu hoặc theo MSSV); chỉ khi LED đã bắt đầu.
  const jumpLed = useMutation({
    mutationFn: (target: 'first' | { studentCode: string }) => {
      if (!hall || !session) throw new Error('Chưa chọn side hoặc session');
      return jumpLedQueue(Number(hall), Number(session), target);
    },
    onSuccess: () => {
      setPanel(null);
      getBachelorCurrent.mutate();
    },
    onError: (error: unknown) => {
      toast.error(getHttpErrorMessage(error, 'Không chuyển được LED'), { duration: 4000 });
    },
  });

  // ---- Tự gọi lần đầu khi đã chọn đủ hall/session
  useEffect(() => {
    if (!hall || !session) {
      toast.error('Chưa chọn side hoặc session', { duration: 3000 });
      return;
    }
    getBachelorCurrent.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hall, session]);

  const isNavigationLocked =
    navigationCooldown > 0 ||
    getBachelorBack.isPending ||
    getBachelorNext.isPending;

  // Người đang chiếu đến trễ: dải "Đến trễ: Tên" trên cùng, viền vàng quanh khung và quanh thẻ Hiện tại.
  const currentLate = isLateBachelor(bachelorCurrent);
  const lateBanner = describeLateBanner(bachelorCurrent);
  const firstLateNext = isFirstLateNext(bachelorCurrent, bachelorNext);
  const pairStyle = {
    '--mc-left': `calc(${split}% - 12px)`,
    '--mc-right': `calc(${100 - split}% - 12px)`,
  } as React.CSSProperties;

  return (
    <div className='min-h-screen p-4'>
      <div className='mx-auto space-y-4'>
        <Card className='shadow-lg border-2 border-orange-200/50 dark:border-orange-900/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm'>
          <CardContent className='p-4'>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    href='/'
                    className='text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300'
                  >
                    Trang chủ
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className='text-orange-400' />
                <BreadcrumbItem>
                  <BreadcrumbPage className='text-orange-800 dark:text-orange-300'>
                    Điều khiển cho MC
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </CardContent>
        </Card>

        <Card className='shadow-lg border-2 border-orange-200/50 dark:border-orange-900/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm'>
          <CardContent className='p-4 gap-4 flex flex-col'>
            <Alert
              variant='soft'
              color='primary'
              className='bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800'
            >
              <AlertDescription className='text-orange-800 dark:text-orange-200'>
                <Icon
                  icon='heroicons-outline:support'
                  className='w-5 h-5 text-orange-500'
                />{' '}
                Nếu bạn cần hỗ trợ, vui lòng liên hệ với ADMIN để được hỗ trợ.
              </AlertDescription>
            </Alert>

            <HallSessionPicker
              storageKey='seatmap'
              onChange={(v) => {
                setHall(v.hallId);
                setSession(v.sessionId);
              }}
            />

            {hall && session && getBachelorCurrent.isSuccess && !bachelorCurrent && (
              <Alert variant='soft' color='warning'>
                <AlertDescription>
                  LED chưa bắt đầu chiếu (hoặc chưa có ai check-in). Manager bấm &quot;Bắt đầu&quot; ở trang Hàng đợi
                  LED thì nút chuyển mới hoạt động.
                </AlertDescription>
              </Alert>
            )}

            <div className='flex items-center justify-between gap-4 p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800'>
              <div className='flex items-center gap-3'>
                <Switch
                  id='show-previous'
                  checked={showPrevious}
                  onCheckedChange={setShowPrevious}
                />
                <Label
                  htmlFor='show-previous'
                  className='text-base font-medium text-orange-800 dark:text-orange-200 cursor-pointer'
                >
                  Hiển thị tân cử nhân trước đó
                </Label>
              </div>

              <div className='flex items-center gap-3'>
              <Button
                onClick={() => setSwapCurrentNext((value) => !value)}
                variant='outline'
                size='lg'
                aria-pressed={swapCurrentNext}
                className='border-2 border-orange-300 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-orange-700 dark:text-orange-300 hover:text-orange-700 dark:hover:text-orange-300'
              >
                <ArrowLeftRight className='w-5 h-5 mr-2' />
                Đổi vị trí Hiện tại / Tiếp theo
              </Button>

              <Button
                onClick={() => void toggleFullscreen()}
                disabled={!hall || !session}
                variant='outline'
                size='lg'
                className='border-2 border-orange-300 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-orange-700 dark:text-orange-300 hover:text-orange-700 dark:hover:text-orange-300'
              >
                {isFullscreen ? (
                  <>
                    <Minimize className='w-5 h-5 mr-2' />
                    Thoát toàn màn hình
                  </>
                ) : (
                  <>
                    <Maximize className='w-5 h-5 mr-2' />
                    Toàn màn hình
                  </>
                )}
              </Button>

              <div className='flex items-center gap-1' role='group' aria-label='Cỡ chữ'>
                <Button
                  onClick={() => setFontScale((value) => stepFontScale(value, -1))}
                  disabled={fontScale <= FONT_SCALE_MIN}
                  variant='outline'
                  size='lg'
                  aria-label='Giảm cỡ chữ'
                  className='border-2 border-orange-300 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-orange-700 dark:text-orange-300 hover:text-orange-700 dark:hover:text-orange-300 px-4'
                >
                  A−
                </Button>
                <Button
                  onClick={() => setFontScale(FONT_SCALE_DEFAULT)}
                  variant='outline'
                  size='lg'
                  aria-label='Đặt lại cỡ chữ'
                  title='Bấm để về 100%'
                  className='min-w-[4.5rem] border-2 border-orange-300 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-orange-700 dark:text-orange-300 hover:text-orange-700 dark:hover:text-orange-300 px-3 tabular-nums'
                >
                  {Math.round(fontScale * 100)}%
                </Button>
                <Button
                  onClick={() => setFontScale((value) => stepFontScale(value, 1))}
                  disabled={fontScale >= FONT_SCALE_MAX}
                  variant='outline'
                  size='lg'
                  aria-label='Tăng cỡ chữ'
                  className='border-2 border-orange-300 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-orange-700 dark:text-orange-300 hover:text-orange-700 dark:hover:text-orange-300 px-4'
                >
                  A+
                </Button>
              </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {hall && session && (
          <div className='animate-fade-up' ref={controlRef}>
            <Card
              className={`shadow-2xl border-2 border-orange-200/50 dark:border-orange-900/50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm ${
                isFullscreen ? 'h-screen flex flex-col' : ''
              } ${currentLate ? LATE_FRAME : ''}`}
            >
              {lateBanner && (
                <div
                  role='alert'
                  className='flex items-center justify-center gap-3 bg-amber-500 px-6 py-3 text-center text-xl font-bold text-white'
                >
                  <Clock className='h-6 w-6 shrink-0' aria-hidden='true' />
                  {lateBanner}
                </div>
              )}
              <CardContent
                className={`p-6 ${
                  isFullscreen ? 'flex-1 flex items-center' : ''
                }`}
              >
                <div
                  className={`grid gap-6 ${
                    showPrevious
                      ? 'grid-cols-1 lg:grid-cols-3'
                      : 'grid-cols-1 lg:grid-cols-2'
                  } ${isFullscreen ? 'w-full' : ''}`}
                >
                  {/* BACK - Side Card */}
                  {showPrevious && (
                    <Card className='shadow-md border-2 border-orange-100 dark:border-orange-900/30 hover:shadow-lg hover:border-orange-200 dark:hover:border-orange-800 transition-all duration-300 opacity-60 hover:opacity-90 bg-white dark:bg-slate-900 self-center order-1'>
                      <CardTitle className='pt-3 px-3'>
                        <div className='flex items-center justify-center gap-2 text-sm text-orange-600 dark:text-orange-400'>
                          <ChevronLeft className='w-4 h-4' />
                          <span>Trước đó</span>
                        </div>
                      </CardTitle>
                      <CardContent className='p-3'>
                        <div className='relative aspect-[16/9] rounded-lg overflow-hidden bg-orange-50 dark:bg-orange-950/20 ring-2 ring-orange-200/50 dark:ring-orange-800/50'>
                          <SafeImg
                            src={bachelorBack?.image}
                            alt='Ảnh tân cử nhân trước'
                            className='object-cover w-full h-full'
                            width={400}
                            height={533}
                          />
                        </div>
                      </CardContent>
                      {bachelorBack ? (
                        <CardDescription className='pb-3 px-3 space-y-1'>
                          <p
                            className='text-center font-semibold leading-tight line-clamp-1 text-orange-900 dark:text-orange-100'
                            style={{ fontSize: scaledRem(0.875, fontScale) }}
                          >
                            {bachelorBack.fullName}
                          </p>
                          <p
                            className='text-center leading-tight text-orange-600 dark:text-orange-400'
                            style={{ fontSize: scaledRem(0.875, fontScale) }}
                          >
                            {bachelorBack.studentCode}
                          </p>
                          <p
                            className='text-center leading-tight text-muted-foreground line-clamp-2'
                            style={{ fontSize: scaledRem(0.75, fontScale) }}
                          >
                            {bachelorBack.major}
                          </p>
                        </CardDescription>
                      ) : (
                        <CardDescription className='pb-3 text-center text-xs opacity-50'>
                          Không có dữ liệu
                        </CardDescription>
                      )}
                    </Card>
                  )}

                  {/* Khung chứa thẻ Hiện tại và Tiếp theo, ở giữa có thanh kéo đổi bề rộng hai bên */}
                  <div
                    ref={pairRef}
                    style={pairStyle}
                    className='order-2 flex min-w-0 flex-col gap-6 lg:col-span-2 lg:flex-row lg:items-center lg:gap-0'
                  >
                  {/* NEXT - Side Card */}
                  <Card
                    className={`shadow-md border-2 border-orange-100 dark:border-orange-900/30 hover:shadow-lg hover:border-orange-200 dark:hover:border-orange-800 transition-all duration-300 opacity-90 hover:opacity-90 bg-white dark:bg-slate-900 self-center lg:flex-none ${
                      swapCurrentNext ? 'order-3 lg:w-[var(--mc-right)]' : 'order-1 lg:w-[var(--mc-left)]'
                    } ${firstLateNext ? NEXT_LATE_BORDER : ''}`}
                  >
                    <CardTitle className='pt-3 px-3'>
                      <div className='flex items-center justify-center gap-2 text-sm text-orange-600 dark:text-orange-400'>
                        <span>Tiếp theo</span>
                        <ChevronRight className='w-4 h-4' />
                      </div>
                    </CardTitle>
                    <CardContent className='p-3'>
                      <div className='relative aspect-[16/9] rounded-lg overflow-hidden bg-orange-50 dark:bg-orange-950/20 ring-2 ring-orange-200/50 dark:ring-orange-800/50'>
                        <SafeImg
                          src={bachelorNext?.image}
                          alt='Ảnh tân cử nhân sau'
                          className='object-cover w-full h-full'
                          width={400}
                          height={533}
                        />
                      </div>
                    </CardContent>
                    {bachelorNext ? (
                      <CardDescription className='pb-3 px-3 space-y-1'>
                        <p
                          className='text-center font-bold leading-tight line-clamp-1 text-orange-900 dark:text-orange-100'
                          style={{ fontSize: scaledRem(1.5, fontScale) }}
                        >
                          {bachelorNext.fullName}
                        </p>
                        <p
                          className='text-center font-semibold leading-tight text-orange-600 dark:text-orange-400'
                          style={{ fontSize: scaledRem(1.25, fontScale) }}
                        >
                          {bachelorNext.studentCode}
                        </p>
                        <p
                          className='text-center leading-tight text-muted-foreground line-clamp-2'
                          style={{ fontSize: scaledRem(1.125, fontScale) }}
                        >
                          {bachelorNext.major}
                        </p>
                      </CardDescription>
                    ) : (
                      <CardDescription className='pb-3 text-center text-xs opacity-50'>
                        Không có dữ liệu
                      </CardDescription>
                    )}
                  </Card>

                  {/* CURRENT - Featured Card */}
                  <Card
                    className={`relative shadow-2xl border-4 scale-100 lg:scale-100 z-10 bg-white dark:bg-slate-900 lg:flex-none ${
                      swapCurrentNext ? 'order-1 lg:w-[var(--mc-left)]' : 'order-3 lg:w-[var(--mc-right)]'
                    } ${
                      currentLate
                        ? 'border-amber-500 dark:border-amber-500'
                        : 'border-orange-500 dark:border-orange-600'
                    }`}
                  >
                    {/* Gradient Border Effect: vàng khi người đang chiếu đến trễ */}
                    <div
                      className={`absolute -inset-1 bg-gradient-to-r rounded-xl opacity-75 blur animate-pulse ${
                        currentLate
                          ? 'from-amber-500 via-amber-500 to-amber-500'
                          : 'from-orange-400 via-orange-500 to-orange-600'
                      }`}
                    ></div>

                    <div className='relative bg-white dark:bg-slate-900 rounded-lg'>
                      {/* Badge */}
                      <div className='absolute -top-3 left-1/2 -translate-x-1/2 z-20'>
                        <Badge
                          className={`text-white px-10 py-3 shadow-lg flex items-center gap-2 text-xl ${
                            currentLate
                              ? 'bg-amber-500'
                              : 'bg-gradient-to-r from-orange-500 to-orange-600'
                          }`}
                        >
                          <span className='font-bold'>HIỆN TẠI TRÊN LED</span>
                        </Badge>
                      </div>

                      <CardContent className='p-6'>
                        <div className='relative aspect-[16/9] rounded-xl overflow-hidden bg-orange-50 dark:bg-orange-950/20 ring-4 ring-orange-500/50 shadow-xl'>
                          <SafeImg
                            src={bachelorCurrent?.image}
                            alt='Ảnh tân cử nhân hiện tại'
                            className='object-cover w-full h-full'
                            width={1000}
                            height={1333}
                          />
                          {/* Shine Effect */}
                          {/* <div className='absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent '></div> */}
                        </div>
                      </CardContent>

                      {bachelorCurrent ? (
                        <CardDescription className='pb-6 px-6 space-y-4'>
                          <div className='bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 rounded-lg p-6 space-y-3 border border-orange-200 dark:border-orange-800'>
                            <p
                              className='text-center font-bold leading-tight text-orange-900 dark:text-orange-100'
                              style={{ fontSize: scaledRem(1.875, fontScale) }}
                            >
                              {bachelorCurrent.fullName}
                            </p>
                            <p
                              className='text-center font-semibold leading-tight text-orange-600 dark:text-orange-400'
                              style={{ fontSize: scaledRem(1.875, fontScale) }}
                            >
                              {bachelorCurrent.studentCode}
                            </p>
                            <p
                              className='text-center font-bold leading-tight text-orange-700 dark:text-orange-300 line-clamp-2'
                              style={{ fontSize: scaledRem(1.875, fontScale) }}
                            >
                              {bachelorCurrent.major}
                            </p>
                          </div>
                        </CardDescription>
                      ) : (
                        <CardDescription className='pb-6 text-center text-base opacity-50'>
                          Không có dữ liệu
                        </CardDescription>
                      )}
                    </div>
                  </Card>

                  {/* Thanh kéo giữa hai thẻ: chỉ hiện khi rê chuột vào; kéo trái phải để đổi bề rộng, bấm đúp để về 50/50 */}
                  <div
                    role='separator'
                    aria-orientation='vertical'
                    aria-label='Kéo để đổi bề rộng hai thẻ'
                    aria-valuemin={SPLIT_MIN}
                    aria-valuemax={SPLIT_MAX}
                    aria-valuenow={Math.round(split)}
                    tabIndex={0}
                    onPointerDown={(event) => {
                      event.currentTarget.setPointerCapture(event.pointerId);
                      setIsDraggingSplit(true);
                    }}
                    onPointerMove={(event) => {
                      if (!isDraggingSplit || !pairRef.current) return;
                      const rect = pairRef.current.getBoundingClientRect();
                      setSplit(splitFromPointer(event.clientX, rect.left, rect.width));
                    }}
                    onPointerUp={() => setIsDraggingSplit(false)}
                    onPointerCancel={() => setIsDraggingSplit(false)}
                    onDoubleClick={() => setSplit(SPLIT_DEFAULT)}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowLeft') setSplit((value) => clampSplit(value - SPLIT_KEY_STEP));
                      else if (event.key === 'ArrowRight') setSplit((value) => clampSplit(value + SPLIT_KEY_STEP));
                      else return;
                      event.preventDefault();
                    }}
                    className='group order-2 hidden w-6 shrink-0 cursor-col-resize touch-none select-none items-center justify-center self-stretch outline-none lg:flex'
                  >
                    <div
                      className={`h-24 w-1.5 rounded-full bg-orange-400 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 ${
                        isDraggingSplit ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  </div>
                  </div>
                </div>
              </CardContent>

              {/* Chuyển nhanh: nhóm nút nhỏ sát trái, ngay trên thanh Quay lại / Tiếp theo */}
              <div className='flex items-center px-6 pb-3 pt-1'>
                <div
                  role='group'
                  aria-label='Chuyển nhanh'
                  className='inline-flex items-center overflow-hidden rounded-full border border-orange-300/60 bg-orange-500/5 dark:border-orange-700/60'
                >
                  <button
                    type='button'
                    disabled={!bachelorCurrent || isNavigationLocked || jumpLed.isPending}
                    onClick={() => setPanel('first')}
                    className='inline-flex h-9 items-center gap-1.5 px-4 text-sm font-medium text-orange-700 transition-colors hover:bg-orange-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-orange-300'
                  >
                    <ChevronsLeft className='h-4 w-4' aria-hidden='true' />
                    Về đầu
                  </button>
                  <span className='h-5 w-px bg-orange-300/60 dark:bg-orange-700/60' aria-hidden='true' />
                  <button
                    type='button'
                    disabled={!bachelorCurrent || isNavigationLocked || jumpLed.isPending}
                    onClick={() => setPanel('jump')}
                    className='inline-flex h-9 items-center gap-1.5 px-4 text-sm font-medium text-orange-700 transition-colors hover:bg-orange-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-orange-300'
                  >
                    <Search className='h-4 w-4' aria-hidden='true' />
                    Đến MSSV…
                  </button>
                </div>
              </div>

              {/* Control Buttons */}
              <CardFooter
                className={`flex justify-center items-center gap-4 py-6 bg-gradient-to-r from-orange-50 to-white dark:from-orange-950/20 dark:to-slate-900 border-t-2 border-orange-200 dark:border-orange-900 ${
                  isFullscreen ? 'py-8' : ''
                }`}
              >
                <Button
                  size='lg'
                  variant='outline'
                  disabled={!bachelorBack || isNavigationLocked}
                  onClick={() => {
                    if (isNavigationLocked) return;
                    startNavigationCooldown();
                    getBachelorBack.mutate();
                  }}
                  className='shadow-md hover:shadow-lg transition-all border-2 border-orange-300 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-orange-700 dark:text-orange-300 hover:text-orange-700 dark:hover:text-orange-300 px-6 py-6 text-base'
                >
                  <ChevronLeft className='w-6 h-6 mr-2' />
                  {navigationCooldown > 0 && (
                    <span>({navigationCooldown}s)</span>
                  )}
                  Quay lại
                </Button>

                <div className='px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg shadow-lg font-semibold text-lg max-w-md truncate'>
                  {bachelorCurrent
                    ? `${bachelorCurrent.fullName} - ${bachelorCurrent.studentCode}`
                    : 'Không có dữ liệu'}
                </div>

                <Button
                  size='lg'
                  variant='outline'
                  onClick={() => {
                    if (isNavigationLocked) return;
                    startNavigationCooldown();
                    getBachelorNext.mutate();
                  }}
                  disabled={!bachelorNext || isNavigationLocked}
                  className='shadow-md hover:shadow-lg transition-all border-2 border-orange-300 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-orange-700 dark:text-orange-300 hover:text-orange-700 dark:hover:text-orange-300 px-6 py-6 text-base'
                >
                  Tiếp theo
                  {navigationCooldown > 0 && (
                    <span>({navigationCooldown}s)</span>
                  )}
                  <ChevronRight className='w-6 h-6 ml-2' />
                </Button>
              </CardFooter>
            </Card>

            {/* Khung nổi nằm trong vùng toàn màn hình nên vẫn hiện khi đang trình chiếu */}
            {panel === 'first' && (
              <InlineModal title='Về tân cử nhân đầu tiên?' onClose={() => setPanel(null)}>
                <p className='text-base text-muted-foreground'>
                  LED đang chiếu {bachelorCurrent?.fullName ?? '-'}. Về đầu sẽ chuyển LED về người đầu tiên của hàng đợi.
                </p>
                <div className='flex justify-end gap-3'>
                  <Button variant='outline' onClick={() => setPanel(null)}>
                    Hủy
                  </Button>
                  <Button color='primary' disabled={jumpLed.isPending} onClick={() => jumpLed.mutate('first')}>
                    {jumpLed.isPending ? 'Đang chuyển…' : 'Về đầu'}
                  </Button>
                </div>
              </InlineModal>
            )}
            {panel === 'jump' && (
              <LedJumpPanel
                hall={Number(hall)}
                session={Number(session)}
                busy={jumpLed.isPending}
                onJump={(studentCode) => jumpLed.mutate({ studentCode })}
                onClose={() => setPanel(null)}
              />
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%) translateY(-100%) rotate(45deg);
          }
          100% {
            transform: translateX(100%) translateY(100%) rotate(45deg);
          }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
      `}</style>
    </div>
  );
}
