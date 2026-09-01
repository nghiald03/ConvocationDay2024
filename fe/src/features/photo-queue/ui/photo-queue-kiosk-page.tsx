'use client';

import { FormEvent, RefObject, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Camera,
  CheckCircle2,
  Clock3,
  Maximize2,
  Minimize2,
  Search,
  Ticket,
  UserRound,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { getHttpErrorMessage } from '@/lib/http/get-http-error-message';
import {
  lookupPhotoQueueKiosk,
  requestPhotoQueueNumber,
} from '../api/photo-queue-api';
import type {
  PhotoQueueKioskLookup,
  PhotoQueueRequestResult,
} from '../model/photo-queue';
import { activePhotoQueueSessionQueryOptions } from '../queries/photo-queue-query-options';
import { usePhotoQueueRealtime } from '../queries/use-photo-queue-realtime';

const clockFormatter = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function useCurrentTime() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);

    return () => window.clearInterval(timer);
  }, []);

  return {
    time: now ? clockFormatter.format(now) : '--:--:--',
    date: now ? dateFormatter.format(now) : 'Đang cập nhật',
  };
}

function useFullscreen(targetRef: RefObject<HTMLElement>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function syncFullscreenState() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener('fullscreenchange', syncFullscreenState);
    syncFullscreenState();

    return () =>
      document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, []);

  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      await targetRef.current?.requestFullscreen();
      return;
    }

    await document.exitFullscreen();
  }

  return { isFullscreen, toggleFullscreen };
}

export function PhotoQueueKioskPage() {
  const [studentCode, setStudentCode] = useState('');
  const [lookupResult, setLookupResult] =
    useState<PhotoQueueKioskLookup | null>(null);
  const [result, setResult] = useState<PhotoQueueRequestResult | null>(null);
  const kioskRef = useRef<HTMLElement>(null);
  const realtime = usePhotoQueueRealtime();
  const activeSession = useQuery({
    ...activePhotoQueueSessionQueryOptions,
    refetchInterval: realtime.isConnected ? false : 3000,
  });
  const currentTime = useCurrentTime();
  const fullscreen = useFullscreen(kioskRef);

  const lookup = useMutation({
    mutationFn: lookupPhotoQueueKiosk,
    onSuccess: (data) => {
      setLookupResult(data);
      setResult(null);
      toast.success('Vui lòng kiểm tra và xác nhận thông tin.');
    },
    onError: (error) => {
      setLookupResult(null);
      toast.error(getHttpErrorMessage(error, 'Không tra cứu được thông tin.'));
    },
  });

  const requestNumber = useMutation({
    mutationFn: requestPhotoQueueNumber,
    onSuccess: (data) => {
      setResult(data);
      setLookupResult(null);
      setStudentCode('');
      toast.success(`Đã cấp số ${data.queueNumber} cho ${data.fullName}.`);
    },
    onError: (error) => {
      toast.error(getHttpErrorMessage(error, 'Không bốc được số chụp ảnh.'));
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    lookup.mutate(studentCode.trim());
  }

  function reset() {
    setLookupResult(null);
    setResult(null);
    setStudentCode('');
  }

  return (
    <main
      ref={kioskRef}
      className='relative min-h-screen overflow-hidden bg-[#fffaf4] text-[#151a2a]'
    >
      <div className='pointer-events-none absolute -left-20 -top-12 h-72 w-72 rounded-full border-[34px] border-[#f5d8be]/45 opacity-60' />
      <div className='pointer-events-none absolute right-8 top-24 grid grid-cols-3 gap-3 opacity-45'>
        {Array.from({ length: 9 }).map((_, index) => (
          <span key={index} className='h-2 w-2 rounded-full bg-[#d63b08]' />
        ))}
      </div>
      <div className='pointer-events-none absolute inset-x-0 bottom-0 h-44 rounded-t-[60%] bg-[#fff0df]' />
      <div className='pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-[#d63b08]' />

      <Button
        type='button'
        variant='outline'
        size='icon'
        className='absolute right-4 top-4 z-20 h-11 w-11 border-[#d63b08] bg-white text-[#c73508] shadow-[0_10px_24px_rgba(199,53,8,0.16)] hover:bg-[#d63b08] hover:text-white'
        aria-label={
          fullscreen.isFullscreen ? 'Thoát toàn màn hình' : 'Bật toàn màn hình'
        }
        title={
          fullscreen.isFullscreen ? 'Thoát toàn màn hình' : 'Bật toàn màn hình'
        }
        onClick={() => void fullscreen.toggleFullscreen()}
      >
        {fullscreen.isFullscreen ? (
          <Minimize2 className='h-5 w-5' aria-hidden='true' />
        ) : (
          <Maximize2 className='h-5 w-5' aria-hidden='true' />
        )}
      </Button>

      <div className='relative mx-auto flex min-h-screen w-full max-w-[768px] flex-col px-5 pb-20 pt-8 sm:px-10 sm:pb-24 sm:pt-12'>
        <header className='animate-fade-in-up text-center'>
          <p className='font-serif text-[clamp(2.35rem,8vw,4.75rem)] font-bold leading-none text-[#c73508] drop-shadow-sm'>
            Convocation Day
          </p>
          <div className='mt-3 flex items-center justify-center gap-5 text-[#c73508]'>
            <span className='h-px w-16 bg-[#c73508] sm:w-24' />
            <span className='font-serif text-[clamp(1.55rem,5vw,3rem)] font-bold leading-none tracking-[0.28em] sm:tracking-[0.45em]'>
              2026
            </span>
            <span className='h-px w-16 bg-[#c73508] sm:w-24' />
          </div>

          <div className='mt-7 inline-flex items-center gap-3 rounded-lg border border-[#f0d7c2] bg-white px-5 py-3 text-xl font-extrabold text-[#151a2a] shadow-[0_16px_32px_rgba(199,53,8,0.16)] sm:mt-9 sm:gap-4 sm:px-7 sm:py-4 sm:text-2xl'>
            <Camera
              className='h-7 w-7 text-[#c73508] sm:h-9 sm:w-9'
              aria-hidden='true'
            />
            Bốc số thứ tự
          </div>

          <div className='mx-auto mt-4 h-1.5 w-20 rounded-full bg-[#d63b08] sm:mt-5 sm:w-24' />
          <p className='mx-auto mt-5 max-w-2xl text-[clamp(1.05rem,2.8vw,1.55rem)] font-medium leading-snug text-[#5f6678] sm:mt-6'>
            Nhập MSSV để nhận số chụp ảnh trong phiên đang mở.
          </p>
        </header>

        <section className='animate-fade-in-up mt-8 overflow-hidden rounded-[1.4rem] border border-[#d63b08] bg-white shadow-[0_24px_60px_rgba(199,53,8,0.18)] sm:mt-10 sm:rounded-[1.7rem]'>
          <div className='relative overflow-hidden bg-[#d63b08] px-6 py-6 text-white sm:px-12 sm:py-10'>
            <div className='absolute right-16 top-0 h-48 w-48 rounded-full bg-white/10 blur-2xl' />
            <div className='absolute -right-8 bottom-2 opacity-20'>
              <Ticket className='h-36 w-36' aria-hidden='true' />
            </div>
            <p className='flex items-center gap-3 text-base font-black uppercase sm:gap-4 sm:text-xl'>
              <span className='h-3 w-3 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.95)]' />
              Phiên đang mở
            </p>
            <p className='relative mt-4 break-words text-[clamp(1.14rem,3.9vw,2.04rem)] font-black leading-tight text-white drop-shadow-md sm:mt-6'>
              {activeSession.data?.name ?? 'Chưa có phiên do điều phối chọn'}
            </p>
          </div>

          <form
            onSubmit={submit}
            className='grid gap-5 px-6 py-7 sm:gap-6 sm:px-12 sm:py-11'
          >
            <label
              htmlFor='photo-queue-student-code'
              className='text-xl font-black uppercase sm:text-2xl'
            >
              Nhập MSSV
            </label>
            <div className='relative'>
              <UserRound
                className='absolute left-5 top-1/2 h-7 w-7 -translate-y-1/2 text-[#d63b08] sm:left-6 sm:h-9 sm:w-9'
                aria-hidden='true'
              />
              <Input
                id='photo-queue-student-code'
                value={studentCode}
                onChange={(event) => setStudentCode(event.target.value)}
                className='h-[4.5rem] rounded-lg border-[#d97745] bg-white pl-16 text-2xl font-bold uppercase text-[#151a2a] placeholder:text-[#6b7280] focus-visible:ring-[#c73508] sm:h-24 sm:pl-20 sm:text-3xl'
                placeholder='Nhập MSSV của bạn'
                aria-label='Nhập MSSV'
                autoFocus
              />
            </div>
            <Button
              type='submit'
              className='h-[4.5rem] rounded-lg border border-[#c73508] bg-[#d63b08] text-xl font-black text-white shadow-[0_18px_32px_rgba(199,53,8,0.26)] hover:bg-[#c73508] hover:ring-[#c73508] sm:h-24 sm:text-3xl'
              disabled={
                lookup.isPending || !activeSession.data || !studentCode.trim()
              }
            >
              <Search
                className='mr-3 h-8 w-8 sm:mr-5 sm:h-12 sm:w-12'
                aria-hidden='true'
              />
              Tra cứu thông tin
            </Button>
          </form>
        </section>

        {result && (
          <section className='animate-bounce-in mt-8 rounded-[1.4rem] border border-[#f0d7c2] bg-white p-6 text-center shadow-[0_20px_48px_rgba(21,26,42,0.12)] sm:p-8'>
            <p className='text-lg font-black uppercase text-[#5f6678] sm:text-xl'>
              Số thứ tự của bạn
            </p>
            <p className='mt-3 text-[clamp(2.5rem,10vw,4rem)] font-black leading-none text-[#c73508] tabular-nums'>
              {result.queueNumber}
            </p>
            <p className='mt-4 break-words text-3xl font-black sm:text-4xl'>
              {result.fullName}
            </p>
            <p className='mt-2 text-xl font-bold text-[#5f6678] sm:text-2xl'>
              {result.studentCode}
            </p>
          </section>
        )}

        <section className='animate-fade-in-up relative mx-auto mt-8 w-full max-w-[430px] rounded-[1.4rem] border border-[#f0d7c2] bg-white px-6 py-7 text-center shadow-[0_18px_48px_rgba(21,26,42,0.12)] sm:mt-10 sm:rounded-[1.7rem] sm:px-8 sm:py-8'>
          <Clock3
            className='mx-auto h-11 w-11 text-[#d63b08] sm:h-14 sm:w-14'
            aria-hidden='true'
          />
          <p className='mt-3 text-xl font-medium text-[#151a2a] sm:text-2xl'>
            Thời gian hiện tại
          </p>
          <time className='mt-3 block text-[clamp(1.14rem,3.9vw,2.04rem)] font-black leading-none text-[#d63b08] tabular-nums'>
            {currentTime.time}
          </time>
          <p className='mt-4 text-[clamp(1.1rem,3.6vw,1.55rem)] font-medium capitalize text-[#5f6678]'>
            {currentTime.date}
          </p>
        </section>
      </div>

      <Dialog
        open={Boolean(lookupResult)}
        onOpenChange={(open) => {
          if (!open) setLookupResult(null);
        }}
      >
        <DialogContent
          portalContainer={kioskRef.current}
          className='md:max-w-[600px] w-[94vw] max-w-[820px] rounded-[1.4rem] border-[#f0d7c2] bg-white p-6 text-[#151a2a] shadow-[0_28px_70px_rgba(21,26,42,0.2)] sm:p-8'
        >
          {lookupResult && (
            <div className='animate-scale-in'>
              <DialogHeader>
                <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fff4ea] text-[#c73508]'>
                  <UserRound className='h-9 w-9' aria-hidden='true' />
                </div>
                <DialogTitle className='pt-3 text-center text-2xl font-black text-[#151a2a] sm:text-3xl'>
                  Xác nhận thông tin
                </DialogTitle>
              </DialogHeader>

              <div className='mt-6 grid gap-3 text-lg sm:text-xl'>
                <InfoRow label='Họ tên' value={lookupResult.fullName} />
                <InfoRow label='MSSV' value={lookupResult.studentCode} />
                <InfoRow
                  label='Ngành'
                  value={lookupResult.major ?? 'Chưa có thông tin'}
                />
                {lookupResult.existingQueueNumber && (
                  <InfoRow
                    label='Số đã lấy'
                    value={String(lookupResult.existingQueueNumber)}
                  />
                )}
              </div>

              <div className='mt-7 grid gap-3 sm:grid-cols-2'>
                <Button
                  type='button'
                  variant='outline'
                  className='h-14 border-[#d63b08] text-base font-black text-[#c73508] hover:bg-[#d63b08] hover:text-white sm:h-16 sm:text-lg'
                  onClick={reset}
                >
                  Không đúng thông tin
                </Button>
                <Button
                  type='button'
                  className='h-14 bg-[#d63b08] text-base font-black text-white hover:bg-[#c73508] sm:h-16 sm:text-lg'
                  disabled={requestNumber.isPending || Boolean(lookupResult.existingQueueNumber)}
                  onClick={() => requestNumber.mutate(lookupResult.studentCode)}
                >
                  <CheckCircle2 className='mr-2 h-6 w-6' aria-hidden='true' />
                  {lookupResult.existingQueueNumber ? 'Đã bốc số' : 'Xác nhận lấy số'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className='grid gap-1 rounded-lg bg-[#fff4ea] px-4 py-3 sm:grid-cols-[150px_1fr] sm:items-center'>
      <span className='text-base font-black uppercase text-[#c73508]'>
        {label}
      </span>
      <span className='break-words font-extrabold text-[#151a2a]'>{value}</span>
    </div>
  );
}
