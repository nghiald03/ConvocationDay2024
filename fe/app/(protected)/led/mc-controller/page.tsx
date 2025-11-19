'use client';

import HallSessionPicker from '@/components/hallSessionPicker';
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
import { ledAPI } from '@/config/axios';
import { Bachelor } from '@/dtos/BachelorDTO';
import { Icon } from '@iconify/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  GraduationCap,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
} from 'lucide-react';

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
    <Image
      src={src as string}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={(e) => {
        const el = e.currentTarget as HTMLImageElement;
        el.style.display = 'none';
      }}
    />
  );
}

export default function Page() {
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

  const [isFullscreen, setIsFullscreen] = useState(false);
  const controlRef = React.useRef<HTMLDivElement>(null);

  const [hallList, setHallList] = useState<{ value: string; label: string }[]>(
    []
  );
  const [sessionList, setSessionList] = useState<
    { value: string; label: string }[]
  >([]);

  const [bachelorCurrent, setBachelorCurrent] = useState<Bachelor | null>(null);
  const [bachelorBack, setBachelorBack] = useState<Bachelor | null>(null);
  const [bachelorNext, setBachelorNext] = useState<Bachelor | null>(null);

  // ---- Fetch hall
  const { data: hallData, error: hallError } = useQuery({
    queryKey: ['listHall'],
    queryFn: () =>
      ledAPI
        .getHallList()
        .then((res) => res.data)
        .catch((err) => {
          throw err;
        }),
  });

  useEffect(() => {
    if (hallError) {
      toast.error('Lỗi lấy danh sách hall', {
        duration: 3000,
        position: 'top-right',
      });
    }
  }, [hallError]);

  useEffect(() => {
    if (hallData?.data?.length > 0) {
      setHallList(
        hallData.data.map((item: any) => ({
          value: String(item.hallId),
          label: item.hallName,
        }))
      );
    }
  }, [hallData]);

  // ---- Fetch session
  const { data: sessionData, error: sessionError } = useQuery({
    queryKey: ['listSession'],
    queryFn: () =>
      ledAPI
        .getSessionList()
        .then((res) => res.data)
        .catch((err) => {
          throw err;
        }),
  });

  useEffect(() => {
    if (sessionError) {
      toast.error('Lỗi lấy danh sách session', {
        duration: 3000,
        position: 'top-right',
      });
    }
  }, [sessionError]);

  useEffect(() => {
    if (sessionData?.data?.length > 0) {
      setSessionList(
        sessionData.data.map((item: any) => ({
          value: String(item.sessionId),
          label: item.session1,
        }))
      );
    }
  }, [sessionData]);

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
  const toggleFullscreen = () => {
    if (!document.fullscreenElement && controlRef.current) {
      controlRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
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

  // ---- Mutations
  const getBachelorCurrent = useMutation({
    mutationFn: async () => {
      if (!hall || !session) {
        throw new Error('Chưa chọn hall hoặc session');
      }
      return ledAPI.getBachelorCurrent(hall, session);
    },
    onSuccess: (data) => {
      const payload = data?.data?.data;
      if (!payload) {
        setBachelorBack(null);
        setBachelorCurrent(null);
        setBachelorNext(null);
        return;
      }

      setBachelorBack(
        payload.bachelor1 && payload.bachelor1 !== '' ? payload.bachelor1 : null
      );
      setBachelorCurrent(payload.bachelor2 || null);
      setBachelorNext(
        payload.bachelor3 && payload.bachelor3 !== '' ? payload.bachelor3 : null
      );
    },
    onError: () => {
      toast.error('Có lỗi khi lấy dữ liệu. Vui lòng chọn hall/session khác!', {
        duration: 3000,
        position: 'top-right',
      });
    },
  });

  const getBachelor1st = useMutation({
    mutationFn: async () => {
      if (!hall || !session) {
        throw new Error('Chưa chọn hall hoặc session');
      }
      return ledAPI.getBachelor1st(hall, session);
    },
    onSuccess: () => {
      getBachelorCurrent.mutate();
    },
    onError: () => {
      toast.error('Có lỗi khi lấy dữ liệu. Vui lòng chọn hall/session khác!', {
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
        throw new Error('Chưa chọn hall hoặc session');
      }
      return ledAPI.getBachelorNext(hall, session);
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
        throw new Error('Chưa chọn hall hoặc session');
      }
      return ledAPI.getBachelorBack(hall, session);
    },
    onSuccess: () => {
      getBachelorCurrent.mutate();
    },
    onError: () => {
      toast.error('Lỗi khi lấy dữ liệu', { duration: 3000 });
    },
  });

  // ---- Tự gọi lần đầu khi đã chọn đủ hall/session
  useEffect(() => {
    if (!hall || !session) {
      toast.error('Chưa chọn hall hoặc session', { duration: 3000 });
      return;
    }
    getBachelor1st.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hall, session]);

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

              <Button
                onClick={toggleFullscreen}
                variant='outline'
                size='lg'
                className='border-2 border-orange-300 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-orange-700 dark:text-orange-300'
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
            </div>
          </CardContent>
        </Card>

        {hall && session && (
          <div className='animate-fade-up' ref={controlRef}>
            <Card
              className={`shadow-2xl border-2 border-orange-200/50 dark:border-orange-900/50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm ${
                isFullscreen ? 'h-screen flex flex-col' : ''
              }`}
            >
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
                    <Card className='shadow-md border-2 border-orange-100 dark:border-orange-900/30 hover:shadow-lg hover:border-orange-200 dark:hover:border-orange-800 transition-all duration-300 opacity-60 hover:opacity-90 bg-white dark:bg-slate-900 self-center'>
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
                          <p className='text-center font-semibold text-sm line-clamp-1 text-orange-900 dark:text-orange-100'>
                            {bachelorBack.fullName}
                          </p>
                          <p className='text-center text-sm text-orange-600 dark:text-orange-400'>
                            {bachelorBack.studentCode}
                          </p>
                          <p className='text-center text-xs text-muted-foreground line-clamp-2'>
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

                  {/* NEXT - Side Card */}
                  <Card className='shadow-md border-2 border-orange-100 dark:border-orange-900/30 hover:shadow-lg hover:border-orange-200 dark:hover:border-orange-800 transition-all duration-300 opacity-90 hover:opacity-90 bg-white dark:bg-slate-900 self-center'>
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
                        <p className='text-center font-semibold text-sm line-clamp-1 text-orange-900 dark:text-orange-100'>
                          {bachelorNext.fullName}
                        </p>
                        <p className='text-center text-sm text-orange-600 dark:text-orange-400'>
                          {bachelorNext.studentCode}
                        </p>
                        <p className='text-center text-xs text-muted-foreground line-clamp-2'>
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
                  <Card className='relative shadow-2xl border-4 border-orange-500 dark:border-orange-600 scale-100 lg:scale-100 z-10 bg-white dark:bg-slate-900'>
                    {/* Gradient Border Effect */}
                    <div className='absolute -inset-1 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 rounded-xl opacity-75 blur animate-pulse'></div>

                    <div className='relative bg-white dark:bg-slate-900 rounded-lg'>
                      {/* Badge */}
                      <div className='absolute -top-3 left-1/2 -translate-x-1/2 z-20'>
                        <Badge className='bg-gradient-to-r from-orange-500 to-orange-600 text-white px-10 py-3 shadow-lg flex items-center gap-2 text-xl'>
                          <Sparkles className='w-12 h-7' />
                          <span className='font-bold'>HIỆN TẠI</span>
                          <Sparkles className='w-12 h-7' />
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
                            <p className='text-center font-bold text-3xl text-orange-900 dark:text-orange-100'>
                              {bachelorCurrent.fullName}
                            </p>
                            <p className='text-center font-semibold text-3xl text-orange-600 dark:text-orange-400'>
                              {bachelorCurrent.studentCode}
                            </p>
                            <p className='text-center font-bold text-3xl text-orange-700 dark:text-orange-300 line-clamp-2'>
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
                </div>
              </CardContent>

              {/* Control Buttons */}
              <CardFooter
                className={`flex justify-center items-center gap-4 py-6 bg-gradient-to-r from-orange-50 to-white dark:from-orange-950/20 dark:to-slate-900 border-t-2 border-orange-200 dark:border-orange-900 ${
                  isFullscreen ? 'py-8' : ''
                }`}
              >
                <Button
                  size='lg'
                  variant='outline'
                  disabled={!bachelorBack || getBachelorBack.isPending}
                  onClick={() => {
                    if (!getBachelorBack.isPending) getBachelorBack.mutate();
                  }}
                  className='shadow-md hover:shadow-lg transition-all border-2 border-orange-300 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-orange-700 dark:text-orange-300 px-6 py-6 text-base'
                >
                  <ChevronLeft className='w-6 h-6 mr-2' />
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
                    if (!getBachelorNext.isPending) getBachelorNext.mutate();
                  }}
                  disabled={!bachelorNext || getBachelorNext.isPending}
                  className='shadow-md hover:shadow-lg transition-all border-2 border-orange-300 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-orange-700 dark:text-orange-300 px-6 py-6 text-base'
                >
                  Tiếp theo
                  <ChevronRight className='w-6 h-6 ml-2' />
                </Button>
              </CardFooter>
            </Card>
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
