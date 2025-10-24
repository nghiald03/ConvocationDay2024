'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// ===== Mock types =====
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

  // ================== TTS state & logic ==================
  const [enabled, setEnabled] = useState(true);
  const [voiceURI, setVoiceURI] = useState<string>('');
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const playedIdsRef = useRef<Set<string | number>>(new Set());
  const speakingRef = useRef(false);

  // Load voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      if (window.speechSynthesis.onvoiceschanged === loadVoices) {
        (window.speechSynthesis as any).onvoiceschanged = null;
      }
    };
  }, []);

  // Chọn voice mặc định ưu tiên vi-VN
  useEffect(() => {
    if (!voices.length || voiceURI) return;
    const viVN = voices.find((v) => v.lang?.toLowerCase() === 'vi-vn');
    const viAny = voices.find((v) => v.lang?.toLowerCase().startsWith('vi'));
    setVoiceURI((viVN ?? viAny ?? voices[0])?.voiceURI ?? '');
  }, [voices, voiceURI]);

  const speak = (text: string) => {
    if (!enabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const utter = new SpeechSynthesisUtterance(text);
    const voice = voices.find((v) => v.voiceURI === voiceURI) ?? voices[0];
    if (voice) utter.voice = voice;
    utter.rate = clamp(rate, 0.1, 2);
    utter.pitch = clamp(pitch, 0, 2);
    utter.volume = clamp(volume, 0, 1);

    speakingRef.current = true;
    utter.onend = () => (speakingRef.current = false);
    utter.onerror = () => (speakingRef.current = false);

    window.speechSynthesis.speak(utter);
  };

  // Tự phát message mới (theo id)
  useEffect(() => {
    if (!items.length || !enabled) return;

    // newest -> oldest then reverse để phát theo thời gian tăng dần
    const sorted = [...items].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const unplayed = sorted.filter((m) => !playedIdsRef.current.has(m.id));
    if (unplayed.length && !speakingRef.current) {
      const next = unplayed[0];
      playedIdsRef.current.add(next.id);
      speak(humanizeMessage(next));
    }
  }, [items, enabled, voices, voiceURI, rate, pitch, volume]);

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

    // Tránh auto đọc lại lần nữa
    playedIdsRef.current.add(newItem.id);
    if (immediateSpeak) speak(humanizeMessage(newItem));

    setMsg('');
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

      {/* Panel điều khiển TTS + ô nhập test */}
      <Card className='mt-3 animate-fade-up'>
        <CardContent className='p-4 space-y-4'>
          <div className='flex flex-wrap items-center gap-4'>
            <div className='flex items-center gap-2'>
              <span className='text-sm font-medium'>Tự đọc</span>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className='w-64'>
              <label className='text-xs text-muted-foreground'>Giọng đọc</label>
              <Select value={voiceURI} onValueChange={setVoiceURI}>
                <SelectTrigger className='mt-1'>
                  <SelectValue placeholder='Chọn giọng (ưu tiên tiếng Việt)' />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((v) => (
                    <SelectItem key={v.voiceURI} value={v.voiceURI}>
                      {v.name} — {v.lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='w-56'>
              <label className='text-xs text-muted-foreground'>
                Tốc độ (rate): {rate.toFixed(2)}
              </label>
              <Slider
                min={0.1}
                max={2}
                step={0.1}
                value={[rate]}
                onValueChange={(v) => setRate(v[0] ?? 1)}
              />
            </div>

            <div className='w-56'>
              <label className='text-xs text-muted-foreground'>
                Cao độ (pitch): {pitch.toFixed(2)}
              </label>
              <Slider
                min={0}
                max={2}
                step={0.1}
                value={[pitch]}
                onValueChange={(v) => setPitch(v[0] ?? 1)}
              />
            </div>

            <div className='w-56'>
              <label className='text-xs text-muted-foreground'>
                Âm lượng (volume): {volume.toFixed(2)}
              </label>
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={[volume]}
                onValueChange={(v) => setVolume(v[0] ?? 1)}
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
              <Button
                variant='outline'
                onClick={() => {
                  if (
                    typeof window !== 'undefined' &&
                    'speechSynthesis' in window
                  ) {
                    window.speechSynthesis.cancel();
                    speakingRef.current = false;
                  }
                }}
              >
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

            <div className='md:col-span-6 flex gap-2'>
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
                  // Thêm vài mẫu nhanh
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
                    // Không auto speak sample, để user bấm Đọc lại
                  });
                }}
              >
                Thêm 3 mẫu nhanh
              </Button>
              <Button
                variant={'default'}
                color='destructive'
                onClick={() => {
                  queryClient.setQueryData(QUERY_KEY, {
                    data: { data: [] as NotifyMessage[] },
                  });
                  playedIdsRef.current.clear();
                }}
              >
                Xóa danh sách
              </Button>
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
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatTime(iso?: string) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('vi-VN');
  } catch {
    return iso;
  }
}

function humanizeMessage(m: NotifyMessage) {
  const prefix =
    m.priority === 'high'
      ? 'Cảnh báo quan trọng: '
      : m.priority === 'low'
      ? 'Ghi chú: '
      : 'Thông báo: ';
  return `${prefix}${m.message}`;
}
