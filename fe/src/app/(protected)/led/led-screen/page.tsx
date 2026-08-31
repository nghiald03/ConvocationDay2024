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
import HallSessionPicker from '@/features/session/ui/hall-session-picker';
import { getCurrentLedBachelors } from '@/features/led/api/get-led-bachelors';
import {
  isCurrentBachelorForSelection,
  parseCurrentBachelorMessage,
} from '@/features/led/model/parse-current-bachelor-message';
import { Bachelor } from '@/features/bachelor/model/bachelor';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

// === NEW: import hook
import { useRealtime } from '@/lib/realtime/use-realtime';
import SafeImage from '@/components/safe-image';

function BachelorIdentityOverlay({ bachelor }: { bachelor: Bachelor }) {
  return (
    <div className='absolute left-4 top-4 z-10 max-w-[min(720px,calc(100%-2rem))] rounded bg-black px-4 py-3 text-white shadow-lg'>
      <div className='truncate text-2xl font-bold leading-tight'>
        {bachelor.fullName}
      </div>
      <div className='mt-1 flex flex-wrap gap-x-4 gap-y-1 text-base font-semibold'>
        <span>MSSV: {bachelor.studentCode}</span>
        {bachelor.chair ? <span>Ghế: {bachelor.chair}</span> : null}
        <span>Hall: {bachelor.hallName}</span>
        <span>Session: {bachelor.sessionNum}</span>
      </div>
    </div>
  );
}

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

  const [hallLabel, setHallLabel] = useState<string>('Chưa chọn');
  const [sessionLabel, setSessionLabel] = useState<string>('Chưa chọn');
  const [bachelorCurrent, setBachelorCurrent] = useState<Bachelor | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ref tới container ảnh (dùng Fullscreen API)
  const containerRef = useRef<HTMLDivElement | null>(null);

  // ========= SignalR via hook (NO GROUP JOIN) =========
  const { connection, isConnected, connectionState, connectionError, startConnection } =
    useRealtime({
      endpoint: '/events',
      autoConnect: false,
      onConnectionStateChange: () => {
        // the hook exposes connectionState for rendering/debugging
      },
    });

  // Persist selection
  useEffect(() => {
    if (hall) window.localStorage.setItem('hall', hall);
  }, [hall]);
  useEffect(() => {
    if (session) window.localStorage.setItem('session', session);
  }, [session]);

  // ========= Fetch CURRENT once (initial & when hall/session changes) =========
  const queryKey = useMemo(() => ['bachelorCurrent', hall, session], [hall, session]);
  const { data: bachelorCurrentData, isFetching: isFetchingCurrent } = useQuery(
    {
      queryKey,
      queryFn: async () => {
        return (await getCurrentLedBachelors(hall, session)) ?? null;
      },
      enabled: Boolean(hall && session),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchInterval: isConnected ? false : 3000,
    }
  );

  useEffect(() => {
    if (bachelorCurrentData !== undefined) {
      setBachelorCurrent(bachelorCurrentData?.bachelor2 || null);
    }
  }, [bachelorCurrentData]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) await startConnection();
    })();
    return () => {
      mounted = false; /* KHÔNG gọi stopConnection() ở đây */
    };
  }, [startConnection]);

  // Register the SendMessage handler; no group join

  useEffect(() => {
    if (!connection) return;

    const handler = (message: unknown) => {
      try {
        const bachelorData = parseCurrentBachelorMessage(message);

        if (bachelorData && isCurrentBachelorForSelection(bachelorData, hall, session)) {
          setBachelorCurrent(bachelorData);
          queryClient.setQueryData(queryKey, (old: any) => {
            const nextData = { bachelor2: bachelorData };
            if (JSON.stringify(old) === JSON.stringify(nextData)) return old;
            return nextData;
          });
        }
      } catch (e) {
        console.error('Error parsing SignalR payload', e, { message });
      }
    };
    connection.on('SendMessage', handler);
    return () => {
      connection.off('SendMessage', handler);
    };
  }, [connection, hall, session, queryClient, queryKey]);

  // ========= Fullscreen API handling =========
  // Đồng bộ state khi người dùng bấm Esc hoặc trình duyệt thay đổi
  useEffect(() => {
    const onFull = () => {
      const isFs = Boolean(document.fullscreenElement);
      setIsFullscreen(isFs);
    };
    document.addEventListener('fullscreenchange', onFull);
    return () => document.removeEventListener('fullscreenchange', onFull);
  }, []);

  const handleDoubleClick = async () => {
    // Nếu không có ảnh thì không làm gì
    if (!bachelorCurrent?.image) {
      // giữ im lặng hoặc thông báo tuỳ ý; theo yêu cầu em bỏ toast để "vào full màn luôn"
      return;
    }

    try {
      // nếu đang fullscreen thì exit, ngược lại request fullscreen cho containerRef
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        // setIsFullscreen(false) sẽ được cập nhật bởi listener 'fullscreenchange'
      } else if (containerRef.current) {
        // prefer element.requestFullscreen with fallback typings
        const el: any = containerRef.current;
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          // Safari older
          el.webkitRequestFullscreen();
        } else if (el.msRequestFullscreen) {
          el.msRequestFullscreen();
        }
        // setIsFullscreen(true) sẽ được cập nhật bởi listener 'fullscreenchange'
      }
    } catch (e) {
      console.error('Fullscreen error', e);
    }
  };

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
        <CardContent className='p-3 gap-3 flex flex-col'>
          <Alert variant='soft' color='primary'>
            <AlertDescription>
              <Icon icon='heroicons-outline:support' className='w-5 h-5' /> Nếu
              bạn cần hỗ trợ, vui lòng liên hệ với ADMIN để được hỗ trợ.
            </AlertDescription>
          </Alert>

          <HallSessionPicker
            storageKey='seatmap'
            onChange={(v) => {
              setHall(v.hallId);
              setSession(v.sessionId);
            }}
          />

          <Alert variant='soft' color='primary' className=''>
            <AlertDescription>
              <Icon icon='gridicons:fullscreen' className='w-5 h-5' />
              {bachelorCurrent ? (
                <>
                  {' '}
                  Để vào chế độ fullscreen, hãy double-click vào hình ảnh bên
                  dưới ! (sẽ mở chế độ fullscreen của trình duyệt)
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

          <div className='text-sm text-muted-foreground'>
            Realtime: {isConnected ? 'connected' : connectionState}
            {connectionError ? ` (${connectionError})` : null}
          </div>
        </CardContent>
      </Card>

      {/* Fullscreen: sử dụng Fullscreen API trên containerRef */}
      <div ref={containerRef} onDoubleClick={handleDoubleClick}>
        {isFullscreen ? (
          // Khi document ở chế độ fullscreen, hiển thị toàn màn như trước
          <div className='absolute inset-0 z-[999999999] bg-black flex items-center justify-center'>
            <Card className='w-[100vw] h-[100vh]'>
              <CardContent className='relative p-0 w-[100vw] h-[100vh]'>
                {bachelorCurrent?.image && (
                  <>
                    <BachelorIdentityOverlay bachelor={bachelorCurrent} />
                    <SafeImage
                      src={bachelorCurrent.image}
                      alt='Mô tả hình ảnh'
                      className='w-full h-full object-cover animate-fade-in animate-duration-1000'
                      width={1920}
                      height={1080}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        ) : bachelorCurrent?.image ? (
          <Card
            className='mt-3 animate-fade-up animate-duration-1000'
            // vẫn cho phép double click ở vùng này
            onDoubleClick={handleDoubleClick}
          >
            <CardContent className='relative p-3'>
              <BachelorIdentityOverlay bachelor={bachelorCurrent} />
              <SafeImage
                src={bachelorCurrent.image}
                alt='Mô tả hình ảnh'
                className='w-full h-full object-cover'
                width={1920}
                height={1080}
              />
            </CardContent>
          </Card>
        ) : (
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
      </div>
    </>
  );
}

