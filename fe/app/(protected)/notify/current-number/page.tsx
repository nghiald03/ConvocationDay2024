'use client';

import { useEffect, useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';

import { Card, CardContent } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputNumber } from '@/components/ui/input-number';
import toast from 'react-hot-toast';

import {
  type CreateNotificationRequest,
  notificationAPI,
} from '@/config/axios';

// Map local form to API payload
function mapLocalToApi(local: {
  message: string;
  priority: 'high' | 'normal' | 'low' | undefined;
  repeatCount?: number;
}): CreateNotificationRequest {
  return {
    title: 'Thông báo hội trường',
    content: local.message,
    priority: local.priority === 'high' ? 1 : local.priority === 'low' ? 3 : 2,
    isAutomatic: false,
    repeatCount: local.repeatCount || 1,
  };
}

const CURRENT_NUMBER_KEY = 'notify-current-number';

export default function CurrentNumberPage() {
  // Persist current number for convenience
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [callNumber, setCallNumber] = useState<number | ''>('');
  const [repeatCount, setRepeatCount] = useState<number>(1);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = sessionStorage.getItem(CURRENT_NUMBER_KEY);
    if (raw !== null) {
      const n = Number(raw);
      if (!Number.isNaN(n)) setCurrentNumber(n);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (currentNumber === null) sessionStorage.removeItem(CURRENT_NUMBER_KEY);
    else sessionStorage.setItem(CURRENT_NUMBER_KEY, String(currentNumber));
  }, [currentNumber]);

  const createNotificationMutation = useMutation({
    mutationFn: async (request: CreateNotificationRequest) => {
      return notificationAPI.create(request);
    },
    onSuccess: () => {
      toast.success('Đã gửi thông báo gọi số');
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ||
          'Không thể gửi thông báo. Vui lòng thử lại.'
      );
    },
  });

  const handleCallNumber = useCallback(() => {
    if (callNumber === '' || Number.isNaN(Number(callNumber))) return;
    const n = Number(callNumber);
    setCurrentNumber(n);

    const message = `Số ${n} chuẩn bị lên chụp hình.`;
    const request = mapLocalToApi({
      message,
      priority: 'high',
      repeatCount,
    });
    createNotificationMutation.mutate(request);
  }, [callNumber, repeatCount, createNotificationMutation]);

  const handleQueueNotice = useCallback(() => {
    const message = 'Các bạn nhận số thứ tự tới bàn và chờ đến lượt chụp ảnh.';
    const request = mapLocalToApi({
      message,
      priority: 'normal',
      repeatCount,
    });
    createNotificationMutation.mutate(request);
  }, [repeatCount, createNotificationMutation]);

  const bumpCurrent = (delta: number) => {
    setCurrentNumber((prev) => {
      const next =
        prev === null ? (delta >= 0 ? delta : 0) : Math.max(0, prev + delta);
      return next;
    });
  };

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
                <BreadcrumbPage>Gọi số thứ tự</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </CardContent>
      </Card>

      {/* Current number board */}
      <Card className='mt-3 animate-fade-up'>
        <CardContent className='p-4 space-y-3'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-xs text-muted-foreground'>Số đang gọi</p>
              <div className='text-4xl md:text-6xl font-extrabold tracking-widest tabular-nums'>
                {currentNumber !== null ? currentNumber : '—'}
              </div>
            </div>
            {/* <div className='flex gap-2'>
              <Button
                variant='outline'
                onClick={() => bumpCurrent(-1)}
                disabled={currentNumber === null}
              >
                -1
              </Button>
              <Button variant='outline' onClick={() => bumpCurrent(+1)}>
                +1
              </Button>
            </div> */}
          </div>

          <div className='grid gap-3 md:grid-cols-3'>
            <div className='md:col-span-2'>
              <label className='text-xs text-muted-foreground'>
                Cập nhật số đang gọi
              </label>
              <div className='flex gap-2 mt-1'>
                <InputNumber
                  min={0}
                  step={1}
                  defaultValue={currentNumber ?? 0}
                  onChange={(v) => setCallNumber(Number(v))}
                  className='flex-1 h-full'
                />
                <Button
                  onClick={handleCallNumber}
                  size='md'
                  disabled={callNumber === ''}
                >
                  Gọi số
                </Button>
              </div>
            </div>
            <div className='flex items-end'>
              <Button
                className='w-full'
                size='md'
                variant='outline'
                onClick={handleQueueNotice}
              >
                Thông báo &quot;Nhận số thứ tự&quot;
              </Button>
            </div>
          </div>

          <div className='grid gap-3 md:grid-cols-3 mt-2'>
            <div className='w-40'>
              <label className='text-xs text-muted-foreground'>
                Số lần đọc
              </label>
              <Input
                type='number'
                min={1}
                max={5}
                value={repeatCount}
                onChange={(e) =>
                  setRepeatCount(
                    Math.max(1, Math.min(5, Number(e.target.value) || 1))
                  )
                }
                className='mt-1'
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
