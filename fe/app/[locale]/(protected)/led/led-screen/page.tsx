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
import { Card, CardContent } from '@/components/ui/card';
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
import { Icon } from '@/components/ui/icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ledAPI } from '@/config/axios';
import { Bachelor } from '@/dtos/BachelorDTO';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import React, { useEffect, useMemo, useState } from 'react';
import {
  HubConnectionBuilder,
  HubConnection,
  LogLevel,
} from '@microsoft/signalr';
import { toast } from 'sonner';

export default function LedScreen() {
  const queryClient = useQueryClient();

  const [hall, setHall] = useState<string>(() =>
    typeof window !== 'undefined'
      ? window.localStorage.getItem('hall') || ''
      : ''
  );
  const [session, setSession] = useState<string>(() =>
    typeof window !== 'undefined'
      ? window.localStorage.getItem('session') || ''
      : ''
  );

  const [hallList, setHallList] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [sessionList, setSessionList] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [bachelorCurrent, setBachelorCurrent] = useState<Bachelor | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ========= Fetch lists =========
  const { data: hallData, error: hallError } = useQuery({
    queryKey: ['listHall'],
    queryFn: async () => {
      const res = await ledAPI.getHallList();
      return res.data;
    },
  });

  useEffect(() => {
    if (hallData?.data?.length) {
      setHallList(
        hallData.data.map((item: any) => ({
          value: String(item.hallId),
          label: item.hallName,
        }))
      );
    }
  }, [hallData]);

  const { data: sessionData, error: sessionError } = useQuery({
    queryKey: ['listSession'],
    queryFn: async () => {
      const res = await ledAPI.getSessionList();
      return res.data;
    },
  });

  useEffect(() => {
    if (sessionData?.data?.length) {
      setSessionList(
        sessionData.data.map((item: any) => ({
          value: String(item.sessionId),
          label: item.session1,
        }))
      );
    }
  }, [sessionData]);

  // Persist selection
  useEffect(() => {
    if (hall) window.localStorage.setItem('hall', hall);
  }, [hall]);
  useEffect(() => {
    if (session) window.localStorage.setItem('session', session);
  }, [session]);

  // ========= Fetch CURRENT on initial load & when hall/session changes =========
  const {
    data: bachelorCurrentData,
    isFetching: isFetchingCurrent,
    error: currentError,
  } = useQuery({
    queryKey: ['bachelorCurrent', hall, session],
    queryFn: async () => {
      const res = await ledAPI.getBachelorCurrent(hall, session);
      // BE expected to return { data: { ...Bachelor } } or null
      return res?.data?.data ?? null;
    },
    enabled: Boolean(hall && session),
    // We get live updates via SignalR; avoid noisy refetches
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  useEffect(() => {
    if (bachelorCurrentData !== undefined) {
      setBachelorCurrent(bachelorCurrentData.bachelor2 || null);
    }
  }, [bachelorCurrentData]);

  // ========= SignalR (stable, single connection) =========
  useEffect(() => {
    let connection: HubConnection | null = null;

    async function startSignalR() {
      try {
        const url = process.env.NEXT_PUBLIC_SIGNALR_URL?.toString() || '';
        if (!url) return;

        connection = new HubConnectionBuilder()
          .withUrl(url)
          .withAutomaticReconnect()
          .configureLogging(LogLevel.Error)
          .build();

        // Handler must be registered BEFORE start()
        connection.on('SendMessage', (message: string) => {
          // some producers prefix with "CurrentBachelor" and add escape quotes
          const cleaned = message.replace(/^CurrentBachelor\s*/, '').trim();
          const normalized = cleaned
            .replace(/\\?"/g, '"')
            .replace(/,? *\}$/, '}');
          try {
            const parsed = JSON.parse(normalized);
            const bachelorData: Bachelor = {
              image: parsed.Image,
              fullName: parsed.FullName,
              major: parsed.Major,
              studentCode: parsed.StudentCode,
              mail: parsed.Mail,
              hallName: parsed.HallName,
              sessionNum: parsed.SessionNum,
              chair: parsed.Chair ?? null,
              chairParent: parsed.ChairParent ?? null,
            };

            // Only accept updates matching current hall/session and with a valid image
            if (
              String(bachelorData.hallName) === String(hall) &&
              String(bachelorData.sessionNum) === String(session) &&
              bachelorData.image
            ) {
              setBachelorCurrent(bachelorData);
            }
          } catch (e) {
            console.error('Error parsing SignalR payload', e, { message });
          }
        });

        await connection.start();
        // Optional: you could invoke a method to join a group by hall+session if BE supports
        // await connection.invoke("JoinGroup", `${hall}:${session}`)
      } catch (err) {
        console.error('SignalR start failed', err);
      }
    }

    startSignalR();

    return () => {
      if (connection) {
        connection.stop().catch(() => {});
        connection = null;
      }
    };
  }, [hall, session]);

  // ========= UI helpers =========
  const handleDoubleClick = () => {
    if (!hall || !session) {
      toast.error('Vui lòng chọn hall và session trước khi xem trình chiếu', {
        duration: 10000,
        position: 'top-right',
      });
      return;
    }
    setIsFullscreen((v) => !v);
  };

  const hallLabel = useMemo(() => {
    return (
      hallList.find((i) => i.value.toString() === hall.toString())?.label ||
      'Chưa chọn'
    );
  }, [hallList, hall]);

  const sessionLabel = useMemo(() => {
    return (
      sessionList.find((i) => i.value.toString() === session.toString())
        ?.label || 'Chưa chọn'
    );
  }, [sessionList, session]);

  // ========= Render =========
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
                <BreadcrumbPage>Trình chiếu LED</BreadcrumbPage>
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
              <Alert variant='soft' color='success' className='mt-3'>
                <AlertDescription key={hall + session}>
                  <Icon icon='akar-icons:double-check' className='w-5 h-5' />{' '}
                  Cài đặt hall và session bằng cách click tại đây [ hall:{' '}
                  {hallLabel} & session: {sessionLabel} ]
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

          <Alert variant='soft' color='primary' className='mt-3'>
            <AlertDescription>
              <Icon icon='gridicons:fullscreen' className='w-5 h-5' />
              {bachelorCurrent ? (
                <>
                  {' '}
                  Để vào chế độ fullscreen, hãy double-click vào hình ảnh bên
                  dưới !
                </>
              ) : (
                <>
                  {' '}
                  Chưa có dữ liệu trình chiếu! Hãy thông báo cho MC F5 để cập
                  nhật dữ liệu!
                </>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Fullscreen */}
      {isFullscreen ? (
        <div
          className='absolute inset-0 z-[999999999] bg-black flex items-center justify-center'
          onDoubleClick={handleDoubleClick}
        >
          <Card className='w-[100vw] h-[100vh]'>
            <CardContent className='p-0 w-[100vw] h-[100vh]'>
              {bachelorCurrent?.image && (
                <Image
                  src={bachelorCurrent.image}
                  alt='Mô tả hình ảnh'
                  className='w-full h-full object-cover animate-fade-in animate-duration-1000'
                  width={1920}
                  height={1080}
                />
              )}
            </CardContent>
          </Card>
        </div>
      ) : bachelorCurrent?.image ? (
        // Normal card
        <Card
          className='mt-3 animate-fade-up animate-duration-1000'
          onDoubleClick={handleDoubleClick}
        >
          <CardContent className='p-3'>
            <Image
              src={bachelorCurrent.image}
              alt='Mô tả hình ảnh'
              className='w-full h-full object-cover'
              width={1920}
              height={1080}
            />
          </CardContent>
        </Card>
      ) : (
        // Placeholder when no data or still fetching
        <Card className='mt-3'>
          <CardContent className='p-6 text-sm text-muted-foreground'>
            {(!hall || !session) && 'Hãy chọn hall & session để bắt đầu.'}
            {hall &&
              session &&
              isFetchingCurrent &&
              'Đang tải dữ liệu hiện tại…'}
            {hall &&
              session &&
              !isFetchingCurrent &&
              !bachelorCurrent &&
              'Chưa có dữ liệu hiện tại.'}
          </CardContent>
        </Card>
      )}
    </>
  );
}
