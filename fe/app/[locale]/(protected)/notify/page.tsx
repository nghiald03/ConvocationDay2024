'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { useElevenLabsTTS } from '@/hooks/useElevenLabsTTS';

// ===== Types =====
type NotifyMessage = {
  id: string | number;
  message: string;
  createdAt: string; // ISO
  priority?: 'high' | 'normal' | 'low';
};

export default function NotifyMockPage() {
  const queryClient = useQueryClient();
  const QUERY_KEY = ['notify-messages'];

  // Seed cache lần đầu (nếu rỗng)
  useEffect(() => {
    const existing = queryClient.getQueryData<{
      data: { data: NotifyMessage[] };
    }>(QUERY_KEY);
    if (!existing) {
      queryClient.setQueryData(QUERY_KEY, {
        data: { data: [] as NotifyMessage[] },
      });
    }
  }, [queryClient]);

  // Đọc từ cache bằng useQuery
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () =>
      queryClient.getQueryData<{ data: { data: NotifyMessage[] } }>(
        QUERY_KEY
      ) ?? { data: { data: [] as NotifyMessage[] } },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    initialData: { data: { data: [] as NotifyMessage[] } },
  });

  const items: NotifyMessage[] = data?.data?.data ?? [];

  // ================== TTS state & logic (ElevenLabs ONLY) ==================
  const [enabled, setEnabled] = useState(true);
  const [repeatCount, setRepeatCount] = useState<number>(1); // số lần đọc lại

  // ElevenLabs TTS hook (đã hỗ trợ chime, fade-in, repeat không tốn token)
  const { speak: xiSpeak, stop: xiStop } = useElevenLabsTTS();

  const playedIdsRef = useRef<Set<string | number>>(new Set());

  const stopAll = () => {
    xiStop();
  };

  // Hàm speak chung (ElevenLabs)
  const speak = (text: string) => {
    if (!enabled) return;
    xiSpeak(text, {
      repeat: repeatCount,
      chimeUrl: '/sounds/Notification Alert 01.wav',
      chimeVolume: 0.5,
      gain: 2.3,
      fadeInMsChime: 200,
      fadeInMsTTS: 200,
    });
  };

  // Tự phát message mới (theo id)
  useEffect(() => {
    if (!items.length || !enabled) return;

    const sorted = [...items].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const unplayed = sorted.filter((m) => !playedIdsRef.current.has(m.id));
    if (unplayed.length) {
      const next = unplayed[0];
      playedIdsRef.current.add(next.id);
      speak(humanizeMessage(next));
    }
  }, [items, enabled, repeatCount]);

  // ================== Form mock input ==================
  const [msg, setMsg] = useState('');
  const [priority, setPriority] = useState<'high' | 'normal' | 'low'>('normal');
  const [idPrefix, setIdPrefix] = useState('TEST'); // optional

  const addMessage = (immediateSpeak = true) => {
    if (!msg.trim()) return;
    const newItem: NotifyMessage = {
      id: `${idPrefix}-${Date.now()}`,
      message: msg.trim(),
      createdAt: new Date().toISOString(),
      priority,
    };

    queryClient.setQueryData(QUERY_KEY, (prev: any) => {
      const current: NotifyMessage[] = prev?.data?.data ?? [];
      return { data: { data: [...current, newItem] } };
    });

    playedIdsRef.current.add(newItem.id);
    if (immediateSpeak) speak(humanizeMessage(newItem));

    setMsg('');
  };

  // ================== QUICK ACTIONS ==================
  const [callNumber, setCallNumber] = useState<number | ''>(''); // input gọi số nhanh

  /** Thêm message từ text (không đụng form msg hiện tại) */
  const addMessageFromText = (
    text: string,
    level: 'high' | 'normal' | 'low' = 'normal',
    immediateSpeak = true
  ) => {
    const newItem: NotifyMessage = {
      id: `QUICK-${Date.now()}`,
      message: text,
      createdAt: new Date().toISOString(),
      priority: level,
    };
    queryClient.setQueryData(QUERY_KEY, (prev: any) => {
      const current: NotifyMessage[] = prev?.data?.data ?? [];
      return { data: { data: [...current, newItem] } };
    });
    playedIdsRef.current.add(newItem.id);
    if (immediateSpeak) speak(humanizeMessage(newItem));
  };

  const handleCallNumber = () => {
    if (callNumber === '' || Number.isNaN(Number(callNumber))) return;
    const n = Number(callNumber);
    // cập nhật số đang gọi (state + session)
    setCurrentNumber(n);
    addMessageFromText(`Số ${n} chuẩn bị lên chụp hình.`, 'high', true);
    setCallNumber('');
  };

  const handleQueueNotice = () => {
    addMessageFromText(
      'Các bạn nhận số thứ tự tại bàn và chờ đến lượt chụp ảnh.',
      'normal',
      true
    );
  };

  // ================== CURRENT NUMBER (persist to sessionStorage) ==================
  const CURRENT_NUMBER_KEY = 'notify-current-number';
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [editCurrent, setEditCurrent] = useState<string>('');

  // Load from sessionStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = sessionStorage.getItem(CURRENT_NUMBER_KEY);
    if (raw !== null) {
      const n = Number(raw);
      if (!Number.isNaN(n)) {
        setCurrentNumber(n);
        setEditCurrent(String(n));
      }
    }
  }, []);

  // Persist whenever currentNumber changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (currentNumber === null) {
      sessionStorage.removeItem(CURRENT_NUMBER_KEY);
    } else {
      sessionStorage.setItem(CURRENT_NUMBER_KEY, String(currentNumber));
    }
  }, [currentNumber]);

  const bumpCurrent = (delta: number) => {
    setCurrentNumber((prev) => {
      const next =
        prev === null ? (delta >= 0 ? delta : 0) : Math.max(0, prev + delta);
      setEditCurrent(String(next));
      return next;
    });
  };

  const applyEditCurrent = () => {
    const n = Number(editCurrent);
    if (!Number.isNaN(n)) setCurrentNumber(Math.max(0, n));
  };

  const speakCurrent = () => {
    if (currentNumber === null) return;
    speak(
      humanizeMessage({
        id: 'CUR',
        message: `Số ${currentNumber} chuẩn bị lên chụp hình.`,
        createdAt: new Date().toISOString(),
        priority: 'high',
      })
    );
  };

  const resetCurrent = () => {
    setCurrentNumber(null);
    setEditCurrent('');
  };

  const hallName = 'Notify (Mock)';

  return (
    <>
      <Card className='animate-fade-up'>
        <CardContent className='p-3'>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href='/'>Trang chủ</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  Notify (Tự phát âm thanh) — Mock
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </CardContent>
      </Card>

      {/* ======== CURRENT NUMBER BOARD ======== */}
      <Card className='mt-3 animate-fade-up'>
        <CardContent className='p-4 space-y-3'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-xs text-muted-foreground'>Số đang gọi</p>
              <div className='text-4xl md:text-6xl font-extrabold tracking-widest tabular-nums'>
                {currentNumber !== null ? currentNumber : '—'}
              </div>
            </div>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                onClick={() => bumpCurrent(-1)}
                disabled={currentNumber === null}
              >
                –1
              </Button>
              <Button variant='outline' onClick={() => bumpCurrent(+1)}>
                +1
              </Button>
              <Button
                variant='outline'
                onClick={speakCurrent}
                disabled={currentNumber === null}
              >
                Đọc lại số
              </Button>
              <Button
                variant={'default'}
                color='destructive'
                onClick={resetCurrent}
              >
                Reset
              </Button>
            </div>
          </div>

          <div className='grid gap-3 md:grid-cols-3'>
            <div className='md:col-span-2'>
              <label className='text-xs text-muted-foreground'>
                Cập nhật “số đang gọi”
              </label>
              <div className='flex gap-2 mt-1'>
                <Input
                  type='number'
                  inputMode='numeric'
                  placeholder='Nhập số (vd: 11)'
                  value={editCurrent}
                  onChange={(e) => setEditCurrent(e.target.value)}
                />
                <Button onClick={applyEditCurrent}>Cập nhật</Button>
              </div>
            </div>
            <div className='flex items-end'>
              <Button
                className='w-full'
                variant='outline'
                onClick={handleQueueNotice}
              >
                Thông báo “Nhận số thứ tự…”
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Panel điều khiển TTS + ô nhập test */}
      <Card className='mt-3 animate-fade-up'>
        <CardContent className='p-4 space-y-4'>
          <div className='flex flex-wrap items-center gap-4'>
            <div className='flex items-center gap-2'>
              <span className='text-sm font-medium'>Tự đọc</span>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            {/* Số lần đọc lại */}
            <div className='w-40'>
              <label className='text-xs text-muted-foreground'>
                Số lần đọc lại
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

            <div className='ml-auto flex gap-2'>
              <Button
                variant='outline'
                onClick={() =>
                  speak('Xin chào, hệ thống thông báo đang hoạt động.')
                }
              >
                Test đọc
              </Button>
              <Button variant='outline' onClick={stopAll}>
                Dừng đọc
              </Button>
              <Button
                variant='outline'
                onClick={() => refetch()}
                disabled={isFetching}
              >
                Làm mới
              </Button>
            </div>
          </div>

          <div className='border-t pt-4 grid gap-3 md:grid-cols-6'>
            <div className='md:col-span-2'>
              <label className='text-xs text-muted-foreground'>
                Prefix ID (tùy chọn)
              </label>
              <Input
                value={idPrefix}
                onChange={(e) => setIdPrefix(e.target.value)}
                placeholder='VD: TEST'
                className='mt-1'
              />
            </div>

            <div className='md:col-span-2'>
              <label className='text-xs text-muted-foreground'>
                Mức độ (priority)
              </label>
              <Select
                value={priority}
                onValueChange={(v: any) => setPriority(v)}
              >
                <SelectTrigger className='mt-1'>
                  <SelectValue placeholder='Chọn mức độ' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='high'>high</SelectItem>
                  <SelectItem value='normal'>normal</SelectItem>
                  <SelectItem value='low'>low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='md:col-span-6'>
              <label className='text-xs text-muted-foreground'>
                Nội dung thông báo
              </label>
              <Textarea
                rows={3}
                placeholder='Gõ nội dung tiếng Việt cần test...'
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                className='mt-1'
              />
            </div>

            <div className='md:col-span-6 flex flex-wrap gap-2'>
              <Button onClick={() => addMessage(true)} disabled={!msg.trim()}>
                Thêm & đọc thử
              </Button>
              <Button
                variant='outline'
                onClick={() => addMessage(false)}
                disabled={!msg.trim()}
              >
                Chỉ thêm (không đọc)
              </Button>
              <Button
                variant='outline'
                onClick={() => {
                  const samples: Array<
                    Pick<NotifyMessage, 'message' | 'priority'>
                  > = [
                    {
                      message:
                        'Mời tân cử nhân kế tiếp di chuyển về vị trí chụp hình.',
                      priority: 'normal',
                    },
                    {
                      message:
                        'Cảnh báo: Vui lòng giữ trật tự trong hội trường.',
                      priority: 'high',
                    },
                    {
                      message: 'Xin mời quý phụ huynh ổn định chỗ ngồi.',
                      priority: 'low',
                    },
                    {
                      message: 'Số 11 chuẩn bị lên chụp hình.',
                      priority: 'high',
                    },
                    {
                      message:
                        'Các bạn nhận số thứ tự tại bàn và chờ đến lượt chụp ảnh.',
                      priority: 'normal',
                    },
                  ];
                  samples.forEach((s, idx) => {
                    const newItem: NotifyMessage = {
                      id: `SAMPLE-${Date.now()}-${idx}`,
                      message: s.message,
                      createdAt: new Date().toISOString(),
                      priority: s.priority,
                    };
                    queryClient.setQueryData(QUERY_KEY, (prev: any) => {
                      const current: NotifyMessage[] = prev?.data?.data ?? [];
                      return { data: { data: [...current, newItem] } };
                    });
                  });
                }}
              >
                Thêm mẫu nhanh
              </Button>
              <Button
                variant={'default'}
                color='destructive'
                onClick={() => {
                  queryClient.setQueryData(QUERY_KEY, {
                    data: { data: [] as NotifyMessage[] },
                  });
                  playedIdsRef.current.clear();
                  stopAll();
                }}
              >
                Xóa danh sách
              </Button>
            </div>

            {/* NEW: Quick actions gọi số */}
            <div className='md:col-span-6 mt-2 grid gap-3 md:grid-cols-3'>
              <div className='col-span-2 flex items-end gap-3'>
                <div className='flex-1'>
                  <label className='text-xs text-muted-foreground'>
                    Gọi số lên chụp hình
                  </label>
                  <Input
                    type='number'
                    min={0}
                    inputMode='numeric'
                    placeholder='Nhập số (vd: 11)'
                    className='mt-1'
                    value={callNumber}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCallNumber(v === '' ? '' : Number(v));
                    }}
                  />
                </div>
                <Button
                  className='whitespace-nowrap'
                  onClick={handleCallNumber}
                >
                  Gọi số
                </Button>
              </div>

              <div className='flex items-end'>
                <Button
                  variant='outline'
                  className='w-full'
                  onClick={handleQueueNotice}
                >
                  Thông báo “Nhận số thứ tự…”
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danh sách message */}
      <div className='mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3'>
        {isLoading && (
          <>
            {Array.from({ length: 3 }).map((_, idx) => (
              <Card key={idx} className='animate-fade-up'>
                <CardContent className='p-4 space-y-4'>
                  <Skeleton className='h-6 w-1/2' />
                  <Skeleton className='h-4 w-1/3' />
                  <Skeleton className='h-3 w-full' />
                  <Skeleton className='h-3 w-5/6' />
                </CardContent>
              </Card>
            ))}
          </>
        )}

        {!isLoading && isError && (
          <Card className='animate-fade-up'>
            <CardContent className='p-4'>
              <p className='text-sm text-red-600'>Không thể tải dữ liệu.</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <Card className='animate-fade-up'>
            <CardContent className='p-4'>
              <p className='text-sm'>Không có thông báo.</p>
            </CardContent>
          </Card>
        )}

        {items.map((m) => (
          <Card key={m.id} className='animate-fade-up'>
            <CardContent className='p-4 space-y-2'>
              <div className='flex items-center justify-between'>
                <h3 className='font-semibold'>Thông báo</h3>
                {m.priority && (
                  <Badge
                    className={cn(
                      m.priority === 'high' && 'bg-destructive text-white',
                      m.priority === 'normal' && 'bg-primary text-white',
                      m.priority === 'low' && 'bg-muted text-foreground'
                    )}
                  >
                    {m.priority}
                  </Badge>
                )}
              </div>
              <p className='text-sm whitespace-pre-wrap'>{m.message}</p>
              <p className='text-[11px] text-muted-foreground'>
                {formatTime(m.createdAt)}
              </p>
              <div className='flex gap-2 pt-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => speak(humanizeMessage(m))}
                >
                  Đọc lại
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    playedIdsRef.current.add(m.id);
                  }}
                >
                  Đánh dấu đã nghe
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

// ===== Helpers =====
function formatTime(iso?: string) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('vi-VN');
  } catch {
    return iso!;
  }
}

function humanizeMessage(m: NotifyMessage) {
  const prefix =
    m.priority === 'high'
      ? 'Thông báo: '
      : m.priority === 'low'
      ? 'Ghi chú: '
      : 'Thông báo: ';
  return `${prefix}${m.message}`;
}
