'use client';

import { FormEvent, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Camera, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
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

export function PhotoQueueKioskPage() {
  const [studentCode, setStudentCode] = useState('');
  const [lookupResult, setLookupResult] = useState<PhotoQueueKioskLookup | null>(null);
  const [result, setResult] = useState<PhotoQueueRequestResult | null>(null);
  const activeSession = useQuery(activePhotoQueueSessionQueryOptions);

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
    lookup.mutate(studentCode);
  }

  function reset() {
    setLookupResult(null);
    setResult(null);
    setStudentCode('');
  }

  return (
    <main className='min-h-screen bg-background px-6 py-8 text-foreground'>
      <div className='mx-auto flex max-w-5xl flex-col gap-8'>
        <section className='rounded-lg border bg-card p-8 text-card-foreground shadow-sm'>
          <div className='flex items-center gap-3 text-3xl font-bold'>
            <Camera className='h-9 w-9 text-foreground' />
            Bốc số chụp ảnh
          </div>
          <p className='mt-3 text-lg font-semibold text-muted-foreground'>
            Phiên đang mở: {activeSession.data?.name ?? 'Chưa có phiên do điều phối chọn'}
          </p>
          <form onSubmit={submit} className='mt-8 grid gap-4 md:grid-cols-[1fr_180px]'>
            <Input
              value={studentCode}
              onChange={(event) => setStudentCode(event.target.value)}
              className='h-20 text-3xl font-bold'
              placeholder='Nhập MSSV'
              aria-label='Nhập MSSV'
              autoFocus
            />
            <Button
              type='submit'
              variant='outline'
              className='h-20 text-xl font-bold'
              disabled={lookup.isPending || !activeSession.data || !studentCode.trim()}
            >
              <Search className='mr-2 h-6 w-6' />
              Tra cứu
            </Button>
          </form>
        </section>

        {lookupResult && (
          <section className='rounded-lg border bg-card p-8 text-card-foreground shadow-sm'>
            <p className='text-2xl font-bold'>Xác nhận thông tin</p>
            <div className='mt-5 space-y-3 text-2xl'>
              <p>
                <span className='font-semibold'>Họ tên:</span> {lookupResult.fullName}
              </p>
              <p>
                <span className='font-semibold'>MSSV:</span> {lookupResult.studentCode}
              </p>
              <p>
                <span className='font-semibold'>Ngành:</span>{' '}
                {lookupResult.major ?? 'Chưa có thông tin'}
              </p>
              {lookupResult.existingQueueNumber && (
                <p>
                  <span className='font-semibold'>Số đã lấy:</span>{' '}
                  {lookupResult.existingQueueNumber}
                </p>
              )}
            </div>
            <div className='mt-8 grid gap-3 md:grid-cols-2'>
              <Button
                variant='outline'
                className='h-16 text-lg font-bold'
                onClick={reset}
              >
                Không đúng thông tin
              </Button>
              <Button
                variant='outline'
                className='h-16 text-lg font-bold'
                disabled={requestNumber.isPending}
                onClick={() => requestNumber.mutate(lookupResult.studentCode)}
              >
                Xác nhận lấy số
              </Button>
            </div>
          </section>
        )}

        {result && (
          <section className='rounded-lg border bg-card p-8 text-center text-card-foreground shadow-sm'>
            <p className='text-2xl font-semibold text-muted-foreground'>Số thứ tự của bạn</p>
            <p className='mt-4 text-[144px] font-black leading-none text-foreground'>
              {result.queueNumber}
            </p>
            <p className='mt-5 text-4xl font-bold'>{result.fullName}</p>
            <p className='mt-2 text-2xl text-muted-foreground'>{result.studentCode}</p>
          </section>
        )}
      </div>
    </main>
  );
}
