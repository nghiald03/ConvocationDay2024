'use client';

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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ledAPI } from '@/config/axios';
import { Bachelor } from '@/dtos/BachelorDTO';
import { Icon } from '@iconify/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// ====== Helpers cho ảnh ======
const isValidImageSrc = (src?: string | null) => {
  if (!src || typeof src !== 'string') return false;
  const trimmed = src.trim();
  if (trimmed.length < 2) return false;
  // Không dùng data: trực tiếp với next/image (nên fallback)
  if (trimmed.startsWith('data:')) return false;

  // URL tuyệt đối
  try {
    const u = new URL(trimmed);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    // Không phải URL tuyệt đối -> chấp nhận nếu là đường dẫn tương đối có '/'
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
        style={{ width, height }}
      >
        <span className='text-sm opacity-60'>Không có ảnh</span>
      </div>
    );
  }
  return (
    <Image
      src={src as string}
      alt={alt}
      width={width}
      height={height}
      className={className}
      unoptimized
      onError={(e) => {
        // Ẩn khi lỗi tải ảnh
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
      toast.error('Lỗi lấy danh sách hall');
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
      toast.error('Lỗi lấy danh sách session');
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

      // bachelor1/2/3 có thể là '' hoặc object
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
    <>
      <Card>
        <CardContent className='p-3'>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href='/'>Trang chủ</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Điều khiển cho MC</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </CardContent>
      </Card>

      <Card className='mt-3'>
        <CardContent className='p-3'>
          <Alert variant='soft' color='primary'>
            <AlertDescription>
              <Icon icon='heroicons-outline:support' className='w-5 h-5' /> Nếu
              bạn cần hỗ trợ, vui lòng liên hệ với ADMIN để được hỗ trợ.
            </AlertDescription>
          </Alert>

          <Dialog>
            <DialogTrigger asChild>
              <Alert
                variant='soft'
                color='success'
                className='mt-3 cursor-pointer'
              >
                <AlertDescription key={hall + session}>
                  <Icon icon='akar-icons:double-check' className='w-5 h-5' />{' '}
                  Cài đặt hall và session bằng cách click tại đây [ hall:{' '}
                  {hallLabel} và session: {sessionLabel} ]
                </AlertDescription>
              </Alert>
            </DialogTrigger>

            <DialogContent className='sm:max-w-[425px]'>
              <DialogHeader>
                <DialogTitle>Cài đặt hall và session</DialogTitle>
                <DialogDescription>
                  Chọn hall và session để trình chiếu LED rồi bấm lưu
                </DialogDescription>
              </DialogHeader>

              <div className='grid gap-4 py-4'>
                <div className='flex w-full items-center gap-4'>
                  <Select onValueChange={setHall} value={hall}>
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Chọn Hall' />
                    </SelectTrigger>
                    <SelectContent position='item-aligned'>
                      {hallList.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='flex w-full items-center gap-4'>
                  <Select onValueChange={setSession} value={session}>
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Chọn session' />
                    </SelectTrigger>
                    <SelectContent position='item-aligned'>
                      {sessionList.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <DialogClose>
                  <Button>Lưu</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {hall && session && (
        <Card className='mt-3 justify-center align-middle animate-fade-up'>
          <CardContent className='grid grid-cols-3 w-full gap-4 '>
            {/* BACK */}
            <Card className='mt-16 shadow-lg'>
              <CardTitle className='mb-1'>
                <h2 className='text-center text-base'>Tân cử nhân trước</h2>
              </CardTitle>
              <CardContent>
                <SafeImg
                  src={bachelorBack?.image}
                  alt='Ảnh tân cử nhân trước'
                  className='object-cover'
                  width={1920}
                  height={1080}
                />
              </CardContent>
              {bachelorBack ? (
                <CardDescription className='pb-3'>
                  <p className='text-center font-bold text-lg'>
                    {bachelorBack.fullName}
                  </p>
                  <p className='text-center font-bold text-lg'>
                    {bachelorBack.studentCode}
                  </p>
                  <p className='text-center font-bold text-lg'>
                    {bachelorBack.major}
                  </p>
                </CardDescription>
              ) : (
                <CardDescription className='pb-3 text-center opacity-70'>
                  Không tồn tại
                </CardDescription>
              )}
            </Card>

            {/* CURRENT */}
            <Card className='mt-16 shadow-lg'>
              <CardTitle className='mb-1'>
                <h2 className='text-center text-base'>Tân cử nhân hiện tại</h2>
              </CardTitle>
              <CardContent>
                <SafeImg
                  src={bachelorCurrent?.image}
                  alt='Ảnh tân cử nhân hiện tại'
                  className='object-cover'
                  width={1920}
                  height={1080}
                />
              </CardContent>
              {bachelorCurrent ? (
                <CardDescription className='pb-3'>
                  <p className='text-center font-bold text-lg'>
                    {bachelorCurrent.fullName}
                  </p>
                  <p className='text-center font-bold text-lg'>
                    {bachelorCurrent.studentCode}
                  </p>
                  <p className='text-center font-bold text-lg'>
                    {bachelorCurrent.major}
                  </p>
                </CardDescription>
              ) : (
                <CardDescription className='pb-3 text-center opacity-70'>
                  Không tồn tại
                </CardDescription>
              )}
            </Card>

            {/* NEXT */}
            <Card className='mt-16 shadow-lg'>
              <CardTitle className='mb-1'>
                <h2 className='text-center text-base'>Tân cử nhân sau</h2>
              </CardTitle>
              <CardContent>
                <SafeImg
                  src={bachelorNext?.image}
                  alt='Ảnh tân cử nhân sau'
                  className='object-cover'
                  width={1920}
                  height={1080}
                />
              </CardContent>
              {bachelorNext ? (
                <CardDescription className='pb-3'>
                  <p className='text-center font-bold text-lg'>
                    {bachelorNext.fullName}
                  </p>
                  <p className='text-center font-bold text-lg'>
                    {bachelorNext.studentCode}
                  </p>
                  <p className='text-center font-bold text-lg'>
                    {bachelorNext.major}
                  </p>
                </CardDescription>
              ) : (
                <CardDescription className='pb-3 text-center opacity-70'>
                  Không tồn tại
                </CardDescription>
              )}
            </Card>
          </CardContent>

          <CardFooter className='flex justify-center align-middle mt-5 rounded-tr-none rounded-br-none pb-10 gap-2'>
            <Button
              variant='outline'
              disabled={!bachelorBack || getBachelorBack.isPending}
              onClick={() => {
                if (!getBachelorBack.isPending) getBachelorBack.mutate();
              }}
              color='primary'
            >
              <Icon
                icon='fluent:arrow-previous-12-filled'
                className='w-5 h-5'
              />
            </Button>

            <Button
              variant='outline'
              disabled
              color='primary'
              className='rounded-none'
            >
              {bachelorCurrent
                ? `${bachelorCurrent.fullName} ${bachelorCurrent.studentCode}`
                : 'Không tồn tại'}
            </Button>

            <Button
              variant='outline'
              onClick={() => {
                if (!getBachelorNext.isPending) getBachelorNext.mutate();
              }}
              disabled={!bachelorNext || getBachelorNext.isPending}
              color='primary'
            >
              <Icon icon='fluent:arrow-next-12-filled' className='w-5 h-5' />
            </Button>
          </CardFooter>
        </Card>
      )}
    </>
  );
}
