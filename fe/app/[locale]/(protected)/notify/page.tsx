'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

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

import { useElevenLabsTTS } from '@/hooks/useElevenLabsTTS';
import { useSignalR } from '@/hooks/useSignalR';
import {
  notificationAPI,
  CreateNotificationRequest,
  NotificationResponse,
  CreateNotificationResponse,
  ledAPI
} from '@/config/axios';

// ===== API Integration types =====
type NotifyMessage = {
  id: string | number;
  message: string;
  title?: string;
  createdAt: string; // ISO
  priority?: 'high' | 'normal' | 'low';
  repeatCount?: number;
};

// Function to map API response to local format
function mapApiToLocal(apiNotification: NotificationResponse): NotifyMessage {
  return {
    id: apiNotification.notificationId,
    message: apiNotification.content,
    title: apiNotification.title,
    createdAt: apiNotification.createdAt,
    priority: apiNotification.priority === 1 ? 'high' : apiNotification.priority === 3 ? 'low' : 'normal',
    repeatCount: apiNotification.repeatCount
  };
}

// Function to map local format to API request
function mapLocalToApi(local: { message: string; priority: 'high' | 'normal' | 'low'; repeatCount?: number }): CreateNotificationRequest {
  return {
    title: 'Thông báo hội trường',
    content: local.message,
    priority: local.priority === 'high' ? 1 : local.priority === 'low' ? 3 : 2,
    isAutomatic: false,
    repeatCount: local.repeatCount || 1
  };
}

type TTSEngine = 'browser' | 'elevenlabs';

export default function NotifyMockPage() {
  const queryClient = useQueryClient();
  const QUERY_KEY = ['notifications'];

  // Fetch real notifications from API
  const { data: apiData, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const response = await notificationAPI.getAll(1, 50); // Get first 50 notifications
      return response.data;
    },
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    refetchOnWindowFocus: true,
  });

  // Map API data to local format
  const items: NotifyMessage[] = apiData?.notifications?.map(mapApiToLocal) ?? [];

  // ================== TTS state & logic ==================
  const [enabled, setEnabled] = useState(true);
  const [engine, setEngine] = useState<TTSEngine>('elevenlabs'); // mặc định dùng ElevenLabs
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [repeatCount, setRepeatCount] = useState<number>(1); // NEW: số lần đọc lại
  const manualReplayActiveRef = useRef(false); // Prevent auto-play during manual replay
  const operationInProgressRef = useRef(false); // Prevent auto-play during CRUD operations

  // Các tham số cho Browser TTS (fallback)
  const [voiceURI, setVoiceURI] = useState<string>('');
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // ElevenLabs TTS hook (đã hỗ trợ chime, fade-in, repeat không tốn token)
  const { speak: xiSpeak, stop: xiStop } = useElevenLabsTTS();

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

  const playedIdsRef = useRef<Set<string | number>>(new Set());
  const speakingRef = useRef(false);

  // Load voices (chỉ cho Browser TTS)
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

  // Chọn voice mặc định ưu tiên vi-VN (Browser TTS)
  useEffect(() => {
    if (!voices.length || voiceURI) return;
    const viVN = voices.find((v) => v.lang?.toLowerCase() === 'vi-vn');
    const viAny = voices.find((v) => v.lang?.toLowerCase().startsWith('vi'));
    setVoiceURI((viVN ?? viAny ?? voices[0])?.voiceURI ?? '');
  }, [voices, voiceURI]);

  const browserSpeak = (text: string) => {
    console.log('[DEBUG] browserSpeak called with text:', text);

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.log('[DEBUG] Speech synthesis not available');
      return;
    }

    console.log('[DEBUG] Available voices:', voices.length);
    console.log('[DEBUG] Selected voiceURI:', voiceURI);
    console.log('[DEBUG] Speech synthesis queue length:', window.speechSynthesis.pending);
    console.log('[DEBUG] Speech synthesis speaking:', window.speechSynthesis.speaking);

    const utter = new SpeechSynthesisUtterance(text);
    const voice = voices.find((v) => v.voiceURI === voiceURI) ?? voices[0];
    if (voice) {
      utter.voice = voice;
      console.log('[DEBUG] Using voice:', voice.name, voice.lang);
    } else {
      console.log('[DEBUG] No voice found');
    }

    utter.rate = clamp(rate, 0.1, 2);
    utter.pitch = clamp(pitch, 0, 2);
    utter.volume = clamp(volume, 0, 1);

    console.log('[DEBUG] TTS Settings:', { rate: utter.rate, pitch: utter.pitch, volume: utter.volume });

    speakingRef.current = true;
    utter.onstart = () => {
      console.log('[DEBUG] Speech started');
    };
    utter.onend = () => {
      console.log('[DEBUG] Speech ended');
      speakingRef.current = false;
    };
    utter.onerror = (event) => {
      console.log('[DEBUG] Speech error:', event.error);
      speakingRef.current = false;
    };

    console.log('[DEBUG] Calling speechSynthesis.speak()');
    window.speechSynthesis.speak(utter);
  };

  const stopAll = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    xiStop();
    speakingRef.current = false;
  };

  // Hàm speak chung (ưu tiên ElevenLabs) + repeat
  const speak = (text: string) => {
    if (!enabled) return;

    if (engine === 'elevenlabs') {
      // XI: repeat không gọi lại API nhờ cache trong hook; có thể thêm chime nếu muốn
      xiSpeak(text, {
        repeat: repeatCount,
        chimeUrl: '/sounds/Notification Alert 01.wav', // bật nếu muốn âm báo mở đầu
        chimeVolume: 1.0,
        gain: 1.6,
        fadeInMsChime: 200,
        fadeInMsTTS: 200,
      });
    } else {
      // Browser TTS: cứ lặp N lần, Web Speech sẽ tự queue
      for (let i = 0; i < repeatCount; i++) {
        browserSpeak(text);
      }
    }
  };

  // Initialize AudioContext on first user interaction
  const initializeAudioContext = async () => {
    if (audioInitialized) return;

    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      try {
        // This will help with ElevenLabs TTS AudioContext initialization
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
          console.log('[DEBUG] AudioContext resumed successfully');
        }
        setAudioInitialized(true);
        // Don't close the context, keep it for TTS usage
      } catch (error) {
        console.log('[DEBUG] AudioContext initialization failed:', error);
      }
    }
  };

  // Hàm speak với số lần lặp lại cụ thể (cho nút "Đọc lại")
  const speakWithRepeat = async (text: string, times: number = 1) => {
    console.log(`[DEBUG] speakWithRepeat called: text="${text}", times=${times}, enabled=${enabled}, engine=${engine}`);

    if (!enabled) {
      console.log('[DEBUG] TTS is disabled');
      return;
    }

    // Initialize AudioContext on first user interaction
    await initializeAudioContext();

    if (engine === 'elevenlabs') {
      console.log('[DEBUG] Using ElevenLabs TTS');
      xiSpeak(text, {
        repeat: times,
        chimeUrl: '/sounds/Notification Alert 01.wav',
        chimeVolume: 1.0,
        gain: 1.6,
        fadeInMsChime: 200,
        fadeInMsTTS: 200,
      });
    } else {
      console.log('[DEBUG] Using Browser TTS');
      // Browser TTS: lặp N lần
      for (let i = 0; i < times; i++) {
        console.log(`[DEBUG] Browser TTS iteration ${i + 1}/${times}`);
        browserSpeak(text);
      }
    }
  };

  // Tự phát message mới (theo id) - Disabled for all roles
  // All notifications will be played via SignalR broadcast
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

  // ================== Real API form input ==================
  const [msg, setMsg] = useState('');
  const [priority, setPriority] = useState<'high' | 'normal' | 'low'>('normal');

  // ================== Edit/Update state ==================
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editMsg, setEditMsg] = useState('');
  const [editPriority, setEditPriority] = useState<'high' | 'normal' | 'low'>('normal');
  const [editRepeatCount, setEditRepeatCount] = useState<number>(1);

  // Mutation to create new notification with TTS
  const createNotificationMutation = useMutation({
    mutationFn: ({ request, shouldSpeak }: { request: CreateNotificationRequest; shouldSpeak: boolean }) => {
      if (shouldSpeak) {
        operationInProgressRef.current = true; // Block auto-play since we'll manually speak
      } else {
        operationInProgressRef.current = true; // Block auto-play entirely for silent add
      }
      return notificationAPI.create(request);
    },
    onSuccess: async (response, { shouldSpeak }) => {
      // Refresh the notifications list
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(response.data.message || 'Thông báo đã được tạo thành công!');

      if (shouldSpeak) {
        // Get the newly created notification to speak ONLY this one
        try {
          const newNotificationResponse = await notificationAPI.getById(response.data.notificationId);
          const newNotification = mapApiToLocal(newNotificationResponse.data);
          playedIdsRef.current.add(newNotification.id);

          // Manually speak this specific notification
          manualReplayActiveRef.current = true;
          speakWithRepeat(humanizeMessage(newNotification), newNotification.repeatCount || 1);

          // Reset manual replay flag after speaking
          setTimeout(() => {
            manualReplayActiveRef.current = false;
            operationInProgressRef.current = false;
          }, 2000 + ((newNotification.repeatCount || 1) * 3000));
        } catch (error) {
          console.error('Error fetching new notification for TTS:', error);
          // Create a minimal notification for TTS as fallback
          const fallbackNotification: NotifyMessage = {
            id: response.data.notificationId,
            message: msg.trim(),
            createdAt: new Date().toISOString(),
            priority,
            title: 'Thông báo hội trường',
            repeatCount
          };
          playedIdsRef.current.add(fallbackNotification.id);

          manualReplayActiveRef.current = true;
          speakWithRepeat(humanizeMessage(fallbackNotification), repeatCount);

          setTimeout(() => {
            manualReplayActiveRef.current = false;
            operationInProgressRef.current = false;
          }, 2000 + (repeatCount * 3000));
        }
      } else {
        // For silent add, mark as played to prevent auto-play and reset flag
        playedIdsRef.current.add(response.data.notificationId);
        setTimeout(() => {
          operationInProgressRef.current = false;
        }, 1000);
      }

      setMsg('');
    },
    onError: (error: any) => {
      console.error('Error creating notification:', error);
      toast.error('Lỗi khi tạo thông báo: ' + (error.response?.data?.message || error.message));
      operationInProgressRef.current = false;
      manualReplayActiveRef.current = false;
    }
  });

  // Mutation to update notification
  const updateNotificationMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateNotificationRequest }) => {
      operationInProgressRef.current = true; // Block auto-play during update
      return notificationAPI.update(id, data);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(response.data.message || 'Thông báo đã được cập nhật thành công!');
      setEditingId(null);
      setEditMsg('');
      setEditPriority('normal');
      setEditRepeatCount(1);
      // Reset flag after a delay to allow data to settle
      setTimeout(() => {
        operationInProgressRef.current = false;
      }, 1000);
    },
    onError: (error: any) => {
      console.error('Error updating notification:', error);
      toast.error('Lỗi khi cập nhật thông báo: ' + (error.response?.data?.message || error.message));
      operationInProgressRef.current = false; // Reset flag on error
    }
  });

  // Mutation to delete notification
  const deleteNotificationMutation = useMutation({
    mutationFn: (id: number) => {
      operationInProgressRef.current = true; // Block auto-play during delete
      return notificationAPI.delete(id);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(response.data.message || 'Thông báo đã được xóa thành công!');
      // Reset flag after a delay to allow data to settle
      setTimeout(() => {
        operationInProgressRef.current = false;
      }, 1000);
    },
    onError: (error: any) => {
      console.error('Error deleting notification:', error);
      toast.error('Lỗi khi xóa thông báo: ' + (error.response?.data?.message || error.message));
      operationInProgressRef.current = false; // Reset flag on error
    }
  });

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

    const apiRequest = mapLocalToApi({
      message: msg.trim(),
      priority,
      repeatCount
    });

    createNotificationMutation.mutate({ request: apiRequest, shouldSpeak: immediateSpeak });
  };

  // Helper functions for edit/delete
  const startEdit = (notification: NotifyMessage) => {
    setEditingId(notification.id);
    setEditMsg(notification.message);
    setEditPriority(notification.priority || 'normal');
    setEditRepeatCount(notification.repeatCount || 1);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditMsg('');
    setEditPriority('normal');
    setEditRepeatCount(1);
  };

  const saveEdit = () => {
    if (!editMsg.trim() || !editingId) return;

    const apiRequest = mapLocalToApi({
      message: editMsg.trim(),
      priority: editPriority,
      repeatCount: editRepeatCount
    });

    // Convert ID to number as API expects number
    const numericId = typeof editingId === 'string' ? parseInt(editingId) : editingId;
    updateNotificationMutation.mutate({ id: numericId, data: apiRequest });
  };

  const deleteNotification = (id: string | number) => {
    if (confirm('Bạn có chắc chắn muốn xóa thông báo này?')) {
      // Convert ID to number as API expects number
      const numericId = typeof id === 'string' ? parseInt(id) : id;
      deleteNotificationMutation.mutate(numericId);
    }
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
                  Notify (Tự phát âm thanh) — Real API
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

            {/* Các tham số chỉ hữu ích cho Browser TTS */}
            <div
              className={cn(
                'w-64',
                engine !== 'browser' && 'opacity-50 pointer-events-none'
              )}
            >
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

            <div
              className={cn(
                'w-56',
                engine !== 'browser' && 'opacity-50 pointer-events-none'
              )}
            >
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

            <div
              className={cn(
                'w-56',
                engine !== 'browser' && 'opacity-50 pointer-events-none'
              )}
            >
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

            <div
              className={cn(
                'w-56',
                engine !== 'browser' && 'opacity-50 pointer-events-none'
              )}
            >
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
                Số lần lặp lại API
              </label>
              <Input
                type='number'
                min={1}
                max={10}
                value={repeatCount}
                onChange={(e) => setRepeatCount(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                placeholder='1-10'
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
              <Button
                onClick={() => addMessage(true)}
                disabled={!msg.trim() || createNotificationMutation.isPending}
              >
                {createNotificationMutation.isPending ? 'Đang tạo...' : 'Thêm & đọc thử'}
              </Button>
              <Button
                variant='outline'
                onClick={() => addMessage(false)}
                disabled={!msg.trim() || createNotificationMutation.isPending}
              >
                Chỉ thêm (không đọc)
              </Button>
              <Button
                variant='outline'
                onClick={() => {
                  const samples = [
                    {
                      message: 'Mời tân cử nhân kế tiếp di chuyển về vị trí chụp hình.',
                      priority: 'normal' as const,
                    },
                    {
                      message: 'Cảnh báo: Vui lòng giữ trật tự trong hội trường.',
                      priority: 'high' as const,
                    },
                    {
                      message: 'Xin mời quý phụ huynh ổn định chỗ ngồi.',
                      priority: 'low' as const,
                    },
                  ];

                  samples.forEach((sample) => {
                    const apiRequest = mapLocalToApi({
                      message: sample.message,
                      priority: sample.priority,
                      repeatCount: 1
                    });
                    createNotificationMutation.mutate({ request: apiRequest, shouldSpeak: false });
                  });
                }}
                disabled={createNotificationMutation.isPending}
              >
                Thêm 3 mẫu nhanh
              </Button>
              <Button
                variant='outline'
                onClick={() => {
                  // Clear played messages and stop TTS
                  playedIdsRef.current.clear();
                  stopAll();
                  // Refresh data to get latest from API
                  refetch();
                }}
              >
                Làm mới & xóa trạng thái
              </Button>
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
