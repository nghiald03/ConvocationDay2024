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
import { useSignalR } from '@/hooks/useSignalR';
<<<<<<< HEAD
=======
import {
  notificationAPI,
  CreateNotificationRequest,
  NotificationResponse,
  CreateNotificationResponse,
  ledAPI
} from '@/config/axios';
>>>>>>> origin/fea/add_notification

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
      ) ?? {
        data: { data: [] as NotifyMessage[] },
      },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    initialData: { data: { data: [] as NotifyMessage[] } },
  });

  const items: NotifyMessage[] = data?.data?.data ?? [];

  // ================== TTS state & logic (ElevenLabs ONLY) ==================
  const [enabled, setEnabled] = useState(true);
  const [repeatCount, setRepeatCount] = useState<number>(1);
  const [consoleOnly, setConsoleOnly] = useState<boolean>(true);

  const { speak: xiSpeak, stop: xiStop } = useElevenLabsTTS();
<<<<<<< HEAD
=======

  // SignalR connection for receiving TTS broadcasts
  const [signalREnabled, setSignalREnabled] = useState(false);
  const signalREnabledRef = useRef(false); // Add ref to track current state
  const hubUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/chat-hub`
    : 'http://localhost:85/chat-hub';

  // Update ref when state changes
  useEffect(() => {
    signalREnabledRef.current = signalREnabled;
  }, [signalREnabled]);

  const { connectionState, isConnected, joinNoticerGroup, leaveNoticerGroup, startConnection, stopConnection } = useSignalR({
    hubUrl,
    accessToken: typeof window !== 'undefined' ? localStorage.getItem('accessToken') || '' : '',
    autoConnect: false, // We'll manage connection manually
    onTTSBroadcast: (data) => {
      console.log('[SignalR] Received TTS broadcast:', data);
      console.log('[DEBUG] TTS enabled state - signalREnabled:', signalREnabledRef.current, 'enabled:', enabled);

      if (signalREnabledRef.current && enabled) {
        // Create a notification message from the broadcast data
        // Handle both camelCase and PascalCase from backend
        const broadcastMessage: NotifyMessage = {
          id: `broadcast-${data.notificationId || data.NotificationId}`,
          message: data.content || data.Content,
          title: data.title || data.Title,
          createdAt: data.broadcastAt || data.BroadcastAt || new Date().toISOString(),
          priority: (data.priority || data.Priority) === 1 ? 'high' : (data.priority || data.Priority) === 3 ? 'low' : 'normal',
          repeatCount: data.repeatCount || data.RepeatCount || 1
        };

        // Play the broadcast immediately
        manualReplayActiveRef.current = true;
        speakWithRepeat(humanizeMessage(broadcastMessage), broadcastMessage.repeatCount || 1);

        // Reset flag after playing
        setTimeout(() => {
          manualReplayActiveRef.current = false;
        }, 2000 + ((broadcastMessage.repeatCount || 1) * 3000));

        // Show notification
        toast.success(`📢 Phát thanh: ${data.Title || 'Thông báo mới'}`);
      }
    },
    onConnectionStateChange: (state) => {
      console.log('[SignalR] Connection state changed:', state);
    }
  });

>>>>>>> origin/fea/add_notification
  const playedIdsRef = useRef<Set<string | number>>(new Set());

  const stopAll = () => {
    xiStop();
  };

  const speak = (text: string) => {
    if (!enabled) return;
    if (consoleOnly) {
      // eslint-disable-next-line no-console
      console.log('[TTS][DEBUG]', text);
      return;
    }
    xiSpeak(text, {
      repeat: repeatCount,
      chimeUrl: '/sounds/Notification Alert 01.wav',
      chimeVolume: 0.5,
      gain: 2.3,
      fadeInMsChime: 200,
      fadeInMsTTS: 200,
    });
  };

<<<<<<< HEAD
  // Tự phát message mới
=======
  // Tự phát message mới (theo id) - Disabled for all roles
  // All notifications will be played via SignalR broadcast
>>>>>>> origin/fea/add_notification
  useEffect(() => {
    // Disable auto-play from polling - all TTS should come from SignalR broadcast
    console.log('[DEBUG] Auto-play from polling is disabled - notifications will be broadcasted via SignalR');
    return;

    // Keep the rest of the code commented in case we need to re-enable it later
    /*
    if (!items.length || !enabled) return;
    const sorted = [...items].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const unplayed = sorted.filter((m) => !playedIdsRef.current.has(m.id));
<<<<<<< HEAD
    if (unplayed.length) {
      const next = unplayed[0];
      playedIdsRef.current.add(next.id);
      speak(humanizeMessage(next));
    }
  }, [items, enabled, repeatCount, consoleOnly]);
=======
    if (unplayed.length && !speakingRef.current && !manualReplayActiveRef.current && !operationInProgressRef.current) {
      const newest = unplayed[unplayed.length - 1];
      console.log('[DEBUG] Auto-playing newest unplayed message:', newest.id);
      playedIdsRef.current.add(newest.id);
      speakWithRepeat(humanizeMessage(newest), newest.repeatCount || 1);
    }
    */
  }, [
    items.length, // CHỈ trigger khi số lượng messages thay đổi
    enabled,
    // userRole, // Removed - not needed since auto-play is disabled
    // Remove manualReplayActive from dependencies to prevent recursive triggering
  ]);
>>>>>>> origin/fea/add_notification

  // ================== SignalR (tự connect + tự join group trong hook) ==================
  const { connection, connectionState, isConnected } = useSignalR({
    hubUrl: 'http://143.198.84.82:85/chat-hub', // TODO: đổi theo BE của anh
    autoConnect: true, // tự connect khi mount
    forceWebsockets: true,
    stopDelayMs: 3000,
    // accessToken: '...optional...',  // nếu hub cần auth
    onTTSBroadcast: (data) => {
      // Nếu server có bắn ReceiveTTSBroadcast, gom vào UI luôn
      const msg: NotifyMessage = {
        id: data?.id ?? `TTS-${Date.now()}`,
        message: data?.message ?? String(data ?? ''),
        createdAt: data?.createdAt ?? new Date().toISOString(),
        priority: (data?.priority as NotifyMessage['priority']) ?? 'normal',
      };
      // eslint-disable-next-line no-console
      console.log('[SignalR] ReceiveTTSBroadcast', msg);
      queryClient.setQueryData(QUERY_KEY, (prev: any) => {
        const current: NotifyMessage[] = prev?.data?.data ?? [];
        return { data: { data: [...current, msg] } };
      });
    },
    onConnectionStateChange: (s) => {
      // eslint-disable-next-line no-console
      console.log('[SignalR] state:', s);
    },
  });

  // Lắng nghe ReceiveNotify (tên event chính từ BE)
  useEffect(() => {
    if (!connection) return;

    const handler = (payload: any) => {
      const msg: NotifyMessage = {
        id: payload?.id ?? `SR-${Date.now()}`,
        message: payload?.message ?? String(payload ?? ''),
        createdAt: payload?.createdAt ?? new Date().toISOString(),
        priority: (payload?.priority as NotifyMessage['priority']) ?? 'normal',
      };
      // eslint-disable-next-line no-console
      console.log('[SignalR] ReceiveNotify', msg);
      queryClient.setQueryData(QUERY_KEY, (prev: any) => {
        const current: NotifyMessage[] = prev?.data?.data ?? [];
        return { data: { data: [...current, msg] } };
      });
    };

    connection.on('ReceiveNotify', handler);
    return () => {
      connection.off('ReceiveNotify', handler);
    };
  }, [connection, queryClient]);

  // ================== Form mock input ==================
  const [msg, setMsg] = useState('');
  const [priority, setPriority] = useState<'high' | 'normal' | 'low'>('normal');
  const [idPrefix, setIdPrefix] = useState('TEST');

  // Get user role from JWT token
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const decoded = require('jwt-decode').jwtDecode(token) as any;
          // Check both old format ('role') and new format (ClaimTypes.Role)
          const role = decoded?.role || decoded?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
          setUserRole(role || null);
          console.log('[DEBUG] User role detected:', role);
        } catch (error) {
          console.error('Error decoding token:', error);
        }
      }
    }
  }, []);

  // Automatically connect SignalR and enable TTS for Noticer (NO) role users
  useEffect(() => {
    if (userRole === 'NO' && !signalREnabled) {
      console.log('[DEBUG] NO role detected - automatically enabling SignalR connection and TTS');
      setSignalREnabled(true);
      setEnabled(true); // Also enable TTS for automatic playback

      // Delay to ensure state is set before connection
      setTimeout(() => {
        console.log('[DEBUG] Starting SignalR connection for NO role user');
        startConnection();
      }, 100);
    }
  }, [userRole]); // Remove startConnection from dependencies to avoid loop

  // Auto-join Noticer group when SignalR connects for NO role users
  useEffect(() => {
    if (userRole === 'NO' && isConnected) {
      console.log('[DEBUG] NO role user connected to SignalR - joining NO group');
      joinNoticerGroup();
    }
  }, [userRole, isConnected, joinNoticerGroup]);

  // Mutation to broadcast notification to Noticers
  const broadcastNotificationMutation = useMutation({
    mutationFn: (id: number) => {
      // Use different API based on user role
      if (userRole === 'MN') {
        // Manager uses /broadcast endpoint (no status check)
        return notificationAPI.broadcast(id);
      } else {
        // Noticer uses /start-broadcast endpoint (requires PENDING status)
        return notificationAPI.startBroadcast(id);
      }
    },
    onSuccess: (response) => {
      toast.success(response.data.message || 'Thông báo đã được phát đến hệ thống âm thanh!');
    },
    onError: (error: any) => {
      console.error('Error broadcasting notification:', error);
      toast.error('Lỗi khi phát thông báo: ' + (error.response?.data?.message || error.message));
    }
  });

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
  const [callNumber, setCallNumber] = useState<number | ''>('');

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

  // ================== CURRENT NUMBER (sessionStorage) ==================
  const CURRENT_NUMBER_KEY = 'notify-current-number';
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [editCurrent, setEditCurrent] = useState<string>('');

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

  const broadcastNotification = (id: string | number) => {
    if (confirm('Bạn có muốn phát thông báo này đến hệ thống âm thanh không?')) {
      // Convert ID to number as API expects number
      const numericId = typeof id === 'string' ? parseInt(id) : id;
      broadcastNotificationMutation.mutate(numericId);
    }
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

          {/* Optional: trạng thái kết nối */}
          <div className='mt-2 text-xs'>
            Trạng thái SignalR:{' '}
            <span className='font-medium'>{connectionState}</span>{' '}
            {isConnected ? '✅' : '❌'}
          </div>
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

<<<<<<< HEAD
=======
            {/* Chọn engine TTS */}
            <div className='w-40'>
              <label className='text-xs text-muted-foreground'>Engine</label>
              <Select value={engine} onValueChange={(v: any) => setEngine(v)}>
                <SelectTrigger className='mt-1'>
                  <SelectValue placeholder='Chọn engine' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='elevenlabs'>
                    ElevenLabs (khuyên dùng)
                  </SelectItem>
                  <SelectItem value='browser'>Browser TTS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Initialize Audio Context */}
            <div className='w-40'>
              <label className='text-xs text-muted-foreground'>Audio Setup</label>
              <Button
                variant={audioInitialized ? 'default' : 'outline'}
                size='sm'
                onClick={initializeAudioContext}
                className='mt-1 w-full'
                disabled={audioInitialized}
              >
                {audioInitialized ? '✓ Audio Ready' : 'Init Audio'}
              </Button>
            </div>

            {/* SignalR Connection Control */}
            <div className='w-40'>
              <label className='text-xs text-muted-foreground'>
                SignalR ({connectionState})
              </label>
              <Button
                variant={isConnected ? 'default' : 'outline'}
                size='sm'
                onClick={() => {
                  if (!isConnected) {
                    setSignalREnabled(true);
                    startConnection();
                  } else {
                    setSignalREnabled(false);
                    stopConnection();
                  }
                }}
                className='mt-1 w-full'
              >
                {isConnected ? '📡 Connected' : '📡 Connect'}
              </Button>
            </div>

            {/* Test TTS Button */}
            <div className='w-40'>
              <label className='text-xs text-muted-foreground'>Test Audio</label>
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  console.log('[DEBUG] Test TTS button clicked');
                  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance('Xin chào, test âm thanh');
                    utterance.lang = 'vi-VN';
                    utterance.rate = 1;
                    utterance.volume = 1;
                    console.log('[DEBUG] Starting speech synthesis test');
                    window.speechSynthesis.speak(utterance);
                  } else {
                    console.log('[DEBUG] Speech synthesis not supported');
                    alert('Browser không hỗ trợ TTS');
                  }
                }}
                className='mt-1 w-full'
              >
                Test TTS
              </Button>
            </div>

            {/* NEW: Số lần đọc lại */}
>>>>>>> origin/fea/add_notification
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

            <div className='flex items-center gap-2'>
              <span className='text-sm'>Console log only</span>
              <Switch checked={consoleOnly} onCheckedChange={setConsoleOnly} />
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

          {/* SignalR Status and Info */}
          {signalREnabled && (
            <div className='mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200'>
              <div className='flex items-center gap-2 mb-2'>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className='text-sm font-medium'>
                  {isConnected ? '🔊 Đã kết nối hệ thống phát thanh' : '🔇 Chưa kết nối hệ thống phát thanh'}
                </span>
              </div>
              <p className='text-xs text-muted-foreground'>
                {isConnected
                  ? 'Máy này sẽ tự động phát các thông báo được gửi từ Manager. Trạng thái: ' + connectionState
                  : 'Nhấn "Connect" để kết nối với hệ thống phát thanh của trường.'
                }
              </p>
            </div>
          )}
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
<<<<<<< HEAD
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
=======
              {editingId === m.id ? (
                // Edit Mode
                <>
                  <div className='flex items-center justify-between'>
                    <h3 className='font-semibold'>Chỉnh sửa thông báo</h3>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={cancelEdit}
                    >
                      ✕
                    </Button>
                  </div>

                  <div className='space-y-3'>
                    <textarea
                      className='w-full p-2 border rounded-md text-sm resize-none'
                      rows={3}
                      value={editMsg}
                      onChange={(e) => setEditMsg(e.target.value)}
                      placeholder='Nhập nội dung thông báo...'
                    />

                    <div className='flex gap-2 items-center'>
                      <select
                        className='px-2 py-1 border rounded text-sm'
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as 'high' | 'normal' | 'low')}
                      >
                        <option value='low'>Low</option>
                        <option value='normal'>Normal</option>
                        <option value='high'>High</option>
                      </select>

                      <input
                        type='number'
                        min='1'
                        max='10'
                        className='w-16 px-2 py-1 border rounded text-sm'
                        value={editRepeatCount}
                        onChange={(e) => setEditRepeatCount(Number(e.target.value))}
                      />
                      <span className='text-xs text-muted-foreground'>lần</span>
                    </div>

                    <div className='flex gap-2'>
                      <Button
                        size='sm'
                        onClick={saveEdit}
                        disabled={updateNotificationMutation.isPending || !editMsg.trim()}
                      >
                        {updateNotificationMutation.isPending ? 'Đang lưu...' : 'Lưu'}
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={cancelEdit}
                      >
                        Hủy
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                // View Mode
                <>
                  <div className='flex items-center justify-between'>
                    <h3 className='font-semibold'>Thông báo</h3>
                    <div className='flex gap-2'>
                      {m.repeatCount && m.repeatCount > 1 && (
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          {m.repeatCount}x
                        </Badge>
                      )}
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
                  </div>
                  <p className='text-sm whitespace-pre-wrap'>{m.message}</p>
                  <p className='text-[11px] text-muted-foreground'>
                    {formatTime(m.createdAt)}
                  </p>
                  <div className='flex gap-2 pt-2 flex-wrap'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => {
                        console.log('[DEBUG] Read again button clicked for message:', m);
                        const times = m.repeatCount || 1;
                        const text = humanizeMessage(m);
                        console.log(`[DEBUG] Calling speakWithRepeat with text="${text}" and times=${times}`);

                        // Set manual replay flag to prevent auto-play interference
                        manualReplayActiveRef.current = true;

                        // Stop any current speech first
                        stopAll();

                        // Speak only this specific message
                        speakWithRepeat(text, times);

                        // Reset flag after a delay
                        setTimeout(() => {
                          manualReplayActiveRef.current = false;
                        }, 2000 + (times * 3000)); // Estimate time needed based on repeat count
                      }}
                    >
                      Đọc lại {m.repeatCount && m.repeatCount > 1 ? `(${m.repeatCount}x)` : ''}
                    </Button>
                    <Button
                      variant='default'
                      size='sm'
                      className='bg-green-600 hover:bg-green-700 text-white'
                      onClick={() => broadcastNotification(m.id)}
                      disabled={broadcastNotificationMutation.isPending}
                    >
                      📢 {userRole === 'MN' ? 'Phát đến Noticer' : 'Bắt đầu phát'}
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
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => startEdit(m)}
                      disabled={updateNotificationMutation.isPending}
                    >
                      Sửa
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      className='border-red-500 text-red-500 hover:bg-red-50'
                      onClick={() => deleteNotification(m.id)}
                      disabled={deleteNotificationMutation.isPending}
                    >
                      Xóa
                    </Button>
                  </div>
                </>
              )}
>>>>>>> origin/fea/add_notification
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
