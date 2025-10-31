'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@iconify/react';
import { useEffect, useState, useCallback, useRef } from 'react';
import type { NotificationResponse } from '@/config/axios';
import { useElevenLabsTTS } from '@/hooks/useElevenLabsTTS';
import { cn } from '@/lib/utils';
import { useSignalRContext } from './SignalRContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { statisticsAPI, type ActiveHallSummary } from '@/config/axios';

export default function NotificationDisplayPage() {
  const [notifications, setNotifications] = useState<NotificationResponse[]>(
    []
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  // Queue moved to TanStack Query cache
  const [completedNotifications, setCompletedNotifications] = useState<any[]>(
    []
  ); // Các thông báo đã phát
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [maxVisibleNotifications, setMaxVisibleNotifications] = useState(5); // Số thông báo tối đa hiển thị
  const [lastCompletedNotification, setLastCompletedNotification] =
    useState<any>(null); // Thông báo cuối cùng đã phát

  // Error boundary effect
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      setError(
        `Lỗi không xác định: ${event.error?.message || 'Unknown error'}`
      );
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      setError(
        `Lỗi promise: ${event.reason?.message || 'Unknown promise error'}`
      );
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener(
        'unhandledrejection',
        handleUnhandledRejection
      );
    };
  }, []);

  // Get connection and fullscreen state from context (managed by layout)
  let connection: any,
    isConnected: boolean,
    connectionState: string,
    isFullscreen: boolean,
    toggleFullscreen: () => void;
  try {
    const context = useSignalRContext();
    connection = context.connection;
    isConnected = context.isConnected;
    connectionState = context.connectionState;
    isFullscreen = context.isFullscreen;
    toggleFullscreen = context.toggleFullscreen;
  } catch (error) {
    console.error('SignalR Context Error:', error);
    setError('SignalR Context initialization failed');
    connection = null;
    isConnected = false;
    connectionState = 'Disconnected';
    isFullscreen = false;
    toggleFullscreen = () => {};
  }

  // Fetch hall overview data
  const { data: hallData, isLoading: hallLoading } = useQuery({
    queryKey: ['hall-overview'],
    queryFn: () => statisticsAPI.getHallOverview(),
    refetchInterval: 5000, // Refresh every 5s
    refetchIntervalInBackground: true,
  });

  const halls: ActiveHallSummary[] = hallData?.data?.data ?? [];

  // ================== TTS state & logic (ElevenLabs-style wrapper) ==================
  const [enabled, setEnabled] = useState(true);
  const [consoleOnly, setConsoleOnly] = useState(false);

  // Hook ElevenLabs — giữ callback lỗi để không kẹt trạng thái
  const { speak: xiSpeak, stop: xiStop } = useElevenLabsTTS((reason: any) => {
    console.error('TTS Error:', reason);
    setIsReading(false);
  });

  /** Dừng toàn bộ phát âm */
  const stopAll = useCallback(() => {
    xiStop();
  }, [xiStop]);

  /**
   * speak wrapper: theo cấu trúc trang mock
   * - cho phép bật/tắt nhanh
   * - chế độ console only
   * - TRẢ Promise để flow await của anh vẫn hoạt động
   */
  const speak = useCallback(
    (text: string): Promise<void> => {
      if (!enabled) return Promise.resolve();
      if (consoleOnly) {
        // eslint-disable-next-line no-console
        console.log('[TTS][DEBUG]', text);
        return Promise.resolve();
      }
      // trả về promise từ xiSpeak để readNotificationWithRepeat có thể await
      return xiSpeak(text, {
        repeat: 1,
        chimeUrl: '/sounds/Notification Alert 01.wav',
        chimeVolume: 0.5,
        gain: 2.3,
        fadeInMsChime: 200,
        fadeInMsTTS: 200,
      });
    },
    [enabled, consoleOnly, xiSpeak]
  );

  // Sort notifications by priority (1=highest) then by time (oldest first)
  const sortNotifications = (notifs: any[]) => {
    return [...notifs].sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      const timeA = new Date(a.createdAt || a.broadcastAt || 0).getTime();
      const timeB = new Date(b.createdAt || b.broadcastAt || 0).getTime();
      return timeA - timeB;
    });
  };

  // Get token and role from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('Token payload:', payload);

          let role =
            payload[
              'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
            ] ||
            payload['role'] ||
            payload['Role'] ||
            payload['roles']?.[0] ||
            payload['Roles']?.[0];

          console.log('Parsed role:', role);
          setUserRole(role || 'Unknown');
        } catch (error) {
          console.error('Error parsing token:', error);
          setUserRole('Unknown');
        }
      }
    }
  }, []);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // React Query client and keys
  const queryClient = useQueryClient();
  const QUEUE_KEY = ['tts-queue'];
  const COMPLETED_KEY = ['tts-completed'];

  // Ensure cache seeds
  useEffect(() => {
    if (!queryClient.getQueryData(QUEUE_KEY)) {
      queryClient.setQueryData(QUEUE_KEY, [] as any[]);
    }
    if (!queryClient.getQueryData(COMPLETED_KEY)) {
      queryClient.setQueryData(COMPLETED_KEY, [] as any[]);
    }
  }, [queryClient]);

  // Subscribe to queue via query
  const { data: queue = [] } = useQuery<any[]>({
    queryKey: QUEUE_KEY,
    queryFn: async () => (queryClient.getQueryData(QUEUE_KEY) as any[]) ?? [],
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const { data: completedFromCache = [] } = useQuery<any[]>({
    queryKey: COMPLETED_KEY,
    queryFn: async () =>
      (queryClient.getQueryData(COMPLETED_KEY) as any[]) ?? [],
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  // Keep local completed list in sync for UI effects
  useEffect(() => {
    setCompletedNotifications(completedFromCache);
  }, [completedFromCache]);
  // Calculate max visible notifications based on screen height
  useEffect(() => {
    const calculateMaxNotifications = () => {
      const screenHeight = window.innerHeight;
      const notificationHeight = 140; // ước tính cao hơn cho an toàn
      const headerHeight = 80;
      const bottomPadding = 40;
      const availableHeight = screenHeight - headerHeight - bottomPadding;
      const maxNotifications = Math.floor(availableHeight / notificationHeight);

      const finalCount = Math.max(2, Math.min(maxNotifications, 6));
      console.log(
        `[Screen] Screen height: ${screenHeight}px, Available: ${availableHeight}px, Max notifications: ${finalCount}`
      );
      setMaxVisibleNotifications(finalCount);
    };

    calculateMaxNotifications();
    window.addEventListener('resize', calculateMaxNotifications);

    return () =>
      window.removeEventListener('resize', calculateMaxNotifications);
  }, []);

  // Additional safety check to prevent overflow
  useEffect(() => {
    const checkOverflow = () => {
      const container = document.querySelector('.notification-container');
      if (container && completedNotifications.length > 0) {
        const containerHeight = (container as HTMLElement).clientHeight;
        const containerScrollHeight = (container as HTMLElement).scrollHeight;

        console.log(
          `[Overflow Check] Container height: ${containerHeight}px, Scroll height: ${containerScrollHeight}px`
        );

        if (containerScrollHeight > containerHeight + 10) {
          console.warn(
            `[Overflow] Container overflow detected. Reducing notifications from ${maxVisibleNotifications} to ${
              maxVisibleNotifications - 1
            }`
          );
          setMaxVisibleNotifications((prev) => Math.max(2, prev - 1));
        }
      }
    };

    const timer = setTimeout(checkOverflow, 500);
    return () => clearTimeout(timer);
  }, [completedNotifications.length, maxVisibleNotifications]);

  // Listen for broadcasts from SignalR and push into global queue (deduped)
  useEffect(() => {
    if (!connection) return;
    const handler = (data: any) => {
      console.log('[SignalR] Received notification broadcast:', data);
      const baseId =
        data.notificationId ?? `${data.title ?? ''}-${data.content ?? ''}`;
      const time = data.broadcastAt || new Date().toISOString();
      const notif = {
        notificationId: baseId,
        title: data.title,
        content: data.content,
        priority: data.priority || 3,
        hallId: data.hallId,
        sessionId: data.sessionId,
        createdAt: time,
        broadcastAt: data.broadcastAt,
        isAutomatic: data.isAutomatic,
        repeatCount: data.repeatCount || 1,
        currentRepeat: 0,
        id: `${baseId}-${time}`,
        scope: data.scope,
        hallName: data.hallName,
      };

      queryClient.setQueryData(QUEUE_KEY, (prev: any[] = []) => {
        // Dedup by (notificationId + broadcastAt + content)
        const exists = prev.some(
          (x) =>
            (x.notificationId ?? x.id) === notif.notificationId &&
            (x.broadcastAt || x.createdAt) ===
              (notif.broadcastAt || notif.createdAt) &&
            x.content === notif.content
        );
        if (exists) return prev;
        const sorted = sortNotifications([...prev, notif]);
        console.log(`[Queue] Added notification. New length: ${sorted.length}`);
        return sorted;
      });
    };
    connection.on('ReceiveTTSBroadcast', handler);
    return () => {
      connection.off('ReceiveTTSBroadcast', handler);
    };
  }, [connection, queryClient]);

  // Read notification from queue with repeat count
  const readNotificationWithRepeat = useCallback(
    async (notification: any, currentRepeat: number) => {
      console.log(
        `Reading notification: ${notification.title}, lần ${
          currentRepeat + 1
        }/${notification.repeatCount}`
      );

      if (currentRepeat === 0) {
        queryClient.setQueryData(QUEUE_KEY, (prev: any[] = []) => {
          const filtered = prev.filter((item) => item.id !== notification.id);
          console.log(
            `[Queue] Removed from queue. Remaining: ${filtered.length}`
          );
          return filtered;
        });
      }

      setIsReading(true);
      setNotifications([notification]);
      setCurrentIndex(0);

      const textToRead = `Thông báo: ${notification.content}`;

      try {
        // ⚠️ dùng wrapper speak mới (không truyền options), vẫn await được
        await speak(textToRead);

        const nextRepeat = currentRepeat + 1;

        if (nextRepeat >= notification.repeatCount) {
          setIsReading(false);
          setNotifications([]);

          setLastCompletedNotification({
            ...notification,
            completedAt: new Date().toISOString(),
          });

          // Push to completed cache (capped)
          queryClient.setQueryData(COMPLETED_KEY, (prev: any[] = []) => {
            const updated = [
              ...prev,
              { ...notification, completedAt: new Date().toISOString() },
            ];
            return updated.length > maxVisibleNotifications
              ? updated.slice(-maxVisibleNotifications)
              : updated;
          });
        } else {
          setIsReading(false);
          setTimeout(() => {
            readNotificationWithRepeat(notification, nextRepeat);
          }, 2000);
        }
      } catch (error) {
        console.error('Error reading notification:', error);
        setIsReading(false);
        setNotifications([]);
      }
    },
    [speak, maxVisibleNotifications]
  );

  // Process next notification in queue
  const processNextInQueue = useCallback(async () => {
    if (queue.length > 0 && !isReading) {
      console.log(
        `[Queue] Processing next notification. Queue length: ${queue.length}, isReading: ${isReading}`
      );
      const nextNotification = queue[0];
      await readNotificationWithRepeat(nextNotification, 0);
    } else {
      console.log(
        `[Queue] Cannot process. Queue length: ${queue.length}, isReading: ${isReading}`
      );
    }
  }, [queue, isReading, readNotificationWithRepeat]);

  // Auto process queue when new item added or when previous finished
  useEffect(() => {
    console.log(
      `[Queue Effect 1] Queue: ${queue.length}, isReading: ${isReading}, notifications: ${notifications.length}`
    );
    if (queue.length > 0 && !isReading && notifications.length === 0) {
      console.log('[Queue Effect 1] Triggering processNextInQueue');
      processNextInQueue();
    }
  }, [queue.length, isReading, notifications.length, processNextInQueue]);

  // Additional effect to process queue when reading state changes
  useEffect(() => {
    console.log(
      `[Queue Effect 2] Queue: ${queue.length}, isReading: ${isReading}, notifications: ${notifications.length}`
    );
    if (queue.length > 0 && !isReading && notifications.length === 0) {
      console.log('[Queue Effect 2] Triggering processNextInQueue with delay');
      const timer = setTimeout(() => {
        processNextInQueue();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isReading, queue.length, notifications.length, processNextInQueue]);

  const currentNotification = notifications[currentIndex];

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return 'bg-red-500';
      case 2:
        return 'bg-yellow-500';
      case 3:
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPriorityText = (priority: number) => {
    switch (priority) {
      case 1:
        return 'CAO';
      case 2:
        return 'TRUNG BÌNH';
      case 3:
        return 'THẤP';
      default:
        return 'KHÔNG XÁC ĐỊNH';
    }
  };

  const getCardBackground = (priority: number) => {
    switch (priority) {
      case 1:
        return 'bg-gradient-to-br from-red-50 via-red-50 to-red-100';
      case 2:
        return 'bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100';
      case 3:
        return 'bg-gradient-to-br from-green-50 via-emerald-50 to-green-100';
      default:
        return 'bg-white';
    }
  };

  const getCardShadow = (priority: number) => {
    switch (priority) {
      case 1:
        return 'shadow-2xl shadow-red-500/50';
      case 2:
        return 'shadow-2xl shadow-amber-500/50';
      case 3:
        return 'shadow-2xl shadow-green-500/50';
      default:
        return 'shadow-inner';
    }
  };

  const getBorderStyle = (priority: number) => {
    switch (priority) {
      case 1:
        return 'border-red-500';
      case 2:
        return 'border-amber-500';
      case 3:
        return 'border-emerald-500';
      default:
        return 'border-gray-300';
    }
  };

  // Show error if any
  if (error) {
    return (
      <div className='bg-gradient-to-br from-slate-950 via-slate-900 to-black h-full w-full flex items-center justify-center min-h-screen'>
        <div className='text-center text-white p-8'>
          <div className='mb-6'>
            <Icon
              icon='heroicons-outline:exclamation-triangle'
              className='w-16 h-16 mx-auto text-red-400 mb-4'
            />
          </div>
          <h2 className='text-3xl font-bold mb-4 text-white'>Lỗi ứng dụng</h2>
          <p className='text-red-400 mb-6 text-lg'>{error}</p>
          <div className='space-y-3'>
            <button
              onClick={() => window.location.reload()}
              className='px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-semibold'
            >
              Tải lại trang
            </button>
            <div className='text-sm text-slate-400'>
              Nếu vấn đề vẫn tiếp tục, vui lòng liên hệ quản trị viên
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-gradient-to-br from-slate-950 via-slate-900 to-black h-full w-full relative overflow-hidden min-h-screen`}
    >
      {/* Background */}
      <div className='absolute inset-0 overflow-hidden pointer-events-none'>
        <div className='absolute top-0 left-1/4 w-96 h-96 bg-slate-800 rounded-full mix-blend-multiply filter blur-3xl opacity-5'></div>
        <div className='absolute bottom-0 right-1/4 w-96 h-96 bg-slate-900 rounded-full mix-blend-multiply filter blur-3xl opacity-5'></div>
      </div>

      {/* Nút đồng hồ thời gian thực khi fullscreen */}
      {isFullscreen && (
        <div className='fixed top-3 left-3 sm:top-8 sm:left-8 z-50'>
          <Button
            onClick={toggleFullscreen}
            className='bg-gradient-to-r from-slate-700/80 to-slate-800/80 hover:from-slate-600/90 hover:to-slate-700/90 text-white border border-slate-500/40 shadow-xl gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-bold rounded-full backdrop-blur-md transition-all'
          >
            <Icon
              icon='heroicons-outline:clock'
              className='w-8 h-8 sm:w-5 sm:h-5'
            />
            <span className='font-mono text-2xl'>
              {currentTime.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          </Button>
        </div>
      )}

      {/* Main Content */}
      <div className='h-full w-full p-2 sm:p-3 md:p-4 lg:p-6 relative z-10 overflow-auto'>
        <div className='grid grid-cols-1 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 h-full'>
          {/* Left: Main Notification Display */}
          <div className='col-span-1 lg:col-span-4 flex flex-col justify-center items-center w-full relative pb-32'>
            <div className='w-full max-w-4xl px-2 sm:px-0 flex-1 flex items-center justify-center'>
              {/* Single Card with Priority-based Border and Background */}
              <AnimatePresence mode='wait' initial={false}>
                {currentNotification && (
                  <motion.div
                    key={`${currentNotification?.notificationId || Date.now()}`}
                    initial={{
                      opacity: 0,
                      scale: 0.7,
                      y: 80,
                      rotateX: 25,
                      rotateY: 10,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      y: 0,
                      rotateX: 0,
                      rotateY: 0,
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.7,
                      y: -80,
                      rotateX: -25,
                      rotateY: -10,
                    }}
                    transition={{
                      duration: 1.2,
                      ease: [0.25, 0.46, 0.45, 0.94],
                      type: 'spring',
                      stiffness: 80,
                      damping: 20,
                      mass: 1,
                    }}
                    style={{ perspective: '1000px' }}
                  >
                    <Card
                      className={cn(
                        'relative overflow-hidden rounded-3xl border-2 transition-all duration-1000 ease-out backdrop-blur-sm',
                        currentNotification
                          ? getCardBackground(currentNotification.priority)
                          : 'bg-white',
                        currentNotification
                          ? getBorderStyle(currentNotification.priority)
                          : 'border-gray-300'
                      )}
                    >
                      {/* Animated header bar */}
                      <div
                        className={cn(
                          'absolute top-0 left-0 w-full h-1 transition-all duration-1000',
                          currentNotification?.priority === 1 &&
                            'bg-gradient-to-r from-red-400 via-red-500 to-red-600 animate-pulse',
                          currentNotification?.priority === 2 &&
                            'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 animate-pulse',
                          currentNotification?.priority === 3 &&
                            'bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 animate-pulse'
                        )}
                      ></div>

                      {/* Glow effect */}
                      <div
                        className={cn(
                          'absolute inset-0 rounded-3xl opacity-20 blur-3xl transition-all duration-1000',
                          currentNotification?.priority === 1 &&
                            'bg-gradient-to-r from-red-400 to-red-600',
                          currentNotification?.priority === 2 &&
                            'bg-gradient-to-r from-amber-400 to-orange-500',
                          currentNotification?.priority === 3 &&
                            'bg-gradient-to-r from-green-400 to-emerald-500'
                        )}
                      ></div>

                      {/* Content with stagger animation */}
                      <motion.div
                        className='relative z-10'
                        initial='hidden'
                        animate='visible'
                        variants={{
                          hidden: { opacity: 0 },
                          visible: {
                            opacity: 1,
                            transition: {
                              staggerChildren: 0.2,
                              delayChildren: 0.3,
                            },
                          },
                        }}
                      >
                        {/* Header with Badges */}
                        <motion.div
                          variants={{
                            hidden: { opacity: 0, y: 30, scale: 0.8 },
                            visible: {
                              opacity: 1,
                              y: 0,
                              scale: 1,
                              transition: {
                                duration: 0.6,
                                ease: 'easeOut',
                                type: 'spring',
                                stiffness: 100,
                              },
                            },
                          }}
                          className={cn(
                            'flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 p-4 sm:p-6 bg-white/80 backdrop-blur-sm border-b-2 transition-all duration-300',
                            currentNotification?.priority === 1 &&
                              'border-red-500/40',
                            currentNotification?.priority === 2 &&
                              'border-amber-500/40',
                            currentNotification?.priority === 3 &&
                              'border-emerald-500/40',
                            !currentNotification && 'border-gray-200/40'
                          )}
                        >
                          {/* Left: THÔNG BÁO, Scope & Hall */}
                          <div className='flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 w-full sm:w-auto'>
                            <motion.div
                              animate={{
                                scale: [1, 1.05, 1],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: 'easeInOut',
                              }}
                              className='bg-gradient-to-r from-yellow-100 to-amber-100 px-4 py-2 sm:px-6 sm:py-3 rounded-full shadow-sm flex items-center gap-2 sm:gap-3'
                            >
                              <motion.div
                                className='w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500'
                                animate={{
                                  scale: [1, 1.2, 1],
                                  opacity: [0.7, 1, 0.7],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: 'easeInOut',
                                }}
                              ></motion.div>
                              <span className='font-bold text-xs sm:text-sm tracking-wider text-gray-800'>
                                THÔNG BÁO
                              </span>
                            </motion.div>

                            {currentNotification?.scope && (
                              <div className='px-3 py-1.5 sm:px-5 sm:py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white rounded-full font-bold text-xs sm:text-sm tracking-wide hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-600 shadow-lg shadow-indigo-500/40 transition-all duration-300 backdrop-blur-sm'>
                                {currentNotification.scope}
                              </div>
                            )}

                            {currentNotification?.hallName && (
                              <div className='px-3 py-1.5 sm:px-5 sm:py-2.5 bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 text-white rounded-full font-bold text-xs sm:text-sm tracking-wide hover:from-slate-500 hover:via-slate-600 hover:to-slate-700 shadow-lg shadow-slate-500/40 transition-all duration-300 backdrop-blur-sm flex items-center gap-1.5 sm:gap-2'>
                                <Icon
                                  icon='heroicons-outline:building-office'
                                  className='w-3 h-3 sm:w-4 sm:h-4'
                                />
                                {currentNotification.hallName}
                              </div>
                            )}
                          </div>

                          {/* Right: Repeat Count */}
                          <div className='flex items-center gap-2 sm:gap-3'>
                            <div className='px-3 py-1.5 sm:px-5 sm:py-2.5 bg-gradient-to-r from-violet-600 via-purple-600 to-violet-700 text-white rounded-full font-bold text-xs sm:text-sm tracking-wide hover:from-violet-500 hover:via-purple-500 hover:to-violet-600 shadow-lg shadow-violet-500/40 transition-all duration-300 backdrop-blur-sm'>
                              {currentNotification?.repeatCount || 1}x
                            </div>
                          </div>
                        </motion.div>

                        {/* Content */}
                        <CardContent className='p-4 sm:p-8 md:p-12'>
                          {currentNotification && (
                            <div className='space-y-4 sm:space-y-6'>
                              <motion.div
                                className='text-center'
                                variants={{
                                  hidden: { opacity: 0, y: 40 },
                                  visible: {
                                    opacity: 1,
                                    y: 0,
                                    transition: {
                                      duration: 0.8,
                                      ease: 'easeOut',
                                      type: 'spring',
                                      stiffness: 80,
                                    },
                                  },
                                }}
                              >
                                <h2 className='text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight text-gray-900 mb-3 sm:mb-4 tracking-tight'>
                                  {currentNotification.title ||
                                    currentNotification.content}
                                </h2>

                                <div className='flex justify-center'>
                                  <div className='w-20 sm:w-32 h-0.5 sm:h-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full'></div>
                                </div>
                              </motion.div>

                              <motion.div
                                className='bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-10 shadow-lg border border-gray-100 mt-4 sm:mt-8'
                                variants={{
                                  hidden: { opacity: 0, y: 30, scale: 0.95 },
                                  visible: {
                                    opacity: 1,
                                    y: 0,
                                    scale: 1,
                                    transition: {
                                      duration: 0.7,
                                      ease: 'easeOut',
                                      type: 'spring',
                                      stiffness: 90,
                                    },
                                  },
                                }}
                              >
                                <motion.p
                                  className='text-base sm:text-xl md:text-2xl leading-relaxed text-gray-800'
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.5, duration: 0.6 }}
                                >
                                  {currentNotification.content}
                                </motion.p>
                              </motion.div>

                              <motion.div
                                className='flex justify-center items-center mt-4 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200'
                                variants={{
                                  hidden: { opacity: 0, y: 20 },
                                  visible: {
                                    opacity: 1,
                                    y: 0,
                                    transition: {
                                      duration: 0.6,
                                      ease: 'easeOut',
                                      delay: 0.3,
                                    },
                                  },
                                }}
                              >
                                <div className='flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500'>
                                  <div className='w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500'></div>
                                  {new Date(
                                    currentNotification.createdAt
                                  ).toLocaleString('vi-VN')}
                                </div>
                              </motion.div>
                            </div>
                          )}
                        </CardContent>
                      </motion.div>
                    </Card>
                  </motion.div>
                )}

                {/* Last completed notification when queue empty */}
                {!currentNotification &&
                  queue.length === 0 &&
                  !isReading &&
                  lastCompletedNotification && (
                    <motion.div
                      key={`last-${
                        lastCompletedNotification?.notificationId || Date.now()
                      }`}
                      initial={{
                        opacity: 0,
                        scale: 0.7,
                        y: 80,
                        rotateX: 25,
                        rotateY: 10,
                      }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        y: 0,
                        rotateX: 0,
                        rotateY: 0,
                      }}
                      exit={{
                        opacity: 0,
                        scale: 0.7,
                        y: -80,
                        rotateX: -25,
                        rotateY: -10,
                      }}
                      transition={{
                        duration: 1.2,
                        ease: [0.25, 0.46, 0.45, 0.94],
                        type: 'spring',
                        stiffness: 80,
                        damping: 20,
                        mass: 1,
                      }}
                      style={{ perspective: '1000px' }}
                    >
                      <Card
                        className={cn(
                          'relative overflow-hidden rounded-3xl border-2 transition-all duration-1000 ease-out backdrop-blur-sm',
                          lastCompletedNotification
                            ? getCardBackground(
                                lastCompletedNotification.priority
                              )
                            : 'bg-white',
                          lastCompletedNotification
                            ? getBorderStyle(lastCompletedNotification.priority)
                            : 'border-gray-300'
                        )}
                      >
                        <div
                          className={cn(
                            'absolute top-0 left-0 w-full h-1 transition-all duration-1000',
                            lastCompletedNotification?.priority === 1 &&
                              'bg-gradient-to-r from-red-400 via-red-500 to-red-600 animate-pulse',
                            lastCompletedNotification?.priority === 2 &&
                              'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 animate-pulse',
                            lastCompletedNotification?.priority === 3 &&
                              'bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 animate-pulse'
                          )}
                        ></div>

                        <div
                          className={cn(
                            'absolute inset-0 rounded-3xl opacity-20 blur-3xl transition-all duration-1000',
                            lastCompletedNotification?.priority === 1 &&
                              'bg-gradient-to-r from-red-400 to-red-600',
                            lastCompletedNotification?.priority === 2 &&
                              'bg-gradient-to-r from-amber-400 to-orange-500',
                            lastCompletedNotification?.priority === 3 &&
                              'bg-gradient-to-r from-green-400 to-emerald-500'
                          )}
                        ></div>

                        <motion.div
                          className='relative z-10'
                          initial='hidden'
                          animate='visible'
                          variants={{
                            hidden: { opacity: 0 },
                            visible: {
                              opacity: 1,
                              transition: {
                                staggerChildren: 0.2,
                                delayChildren: 0.3,
                              },
                            },
                          }}
                        >
                          <motion.div
                            variants={{
                              hidden: { opacity: 0, y: 30, scale: 0.8 },
                              visible: {
                                opacity: 1,
                                y: 0,
                                scale: 1,
                                transition: {
                                  duration: 0.6,
                                  ease: 'easeOut',
                                  type: 'spring',
                                  stiffness: 100,
                                },
                              },
                            }}
                            className={cn(
                              'flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 p-4 sm:p-6 bg-white/80 backdrop-blur-sm border-b-2 transition-all duration-300',
                              lastCompletedNotification?.priority === 1 &&
                                'border-red-500/40',
                              lastCompletedNotification?.priority === 2 &&
                                'border-amber-500/40',
                              lastCompletedNotification?.priority === 3 &&
                                'border-emerald-500/40',
                              !lastCompletedNotification && 'border-gray-200/40'
                            )}
                          >
                            <div className='flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 w-full sm:w-auto'>
                              <motion.div
                                animate={{
                                  scale: [1, 1.05, 1],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: 'easeInOut',
                                }}
                                className='bg-gradient-to-r from-yellow-100 to-amber-100 px-4 py-2 sm:px-6 sm:py-3 rounded-full shadow-sm flex items-center gap-2 sm:gap-3'
                              >
                                <motion.div
                                  className='w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500'
                                  animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.7, 1, 0.7],
                                  }}
                                  transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                  }}
                                ></motion.div>
                                <span className='font-bold text-xs sm:text-sm tracking-wider text-gray-800'>
                                  THÔNG BÁO
                                </span>
                              </motion.div>

                              {lastCompletedNotification?.scope && (
                                <div className='px-3 py-1.5 sm:px-5 sm:py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white rounded-full font-bold text-xs sm:text-sm tracking-wide hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-600 shadow-lg shadow-indigo-500/40 transition-all duration-300 backdrop-blur-sm'>
                                  {lastCompletedNotification.scope}
                                </div>
                              )}

                              {lastCompletedNotification?.hallName && (
                                <div className='px-3 py-1.5 sm:px-5 sm:py-2.5 bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 text-white rounded-full font-bold text-xs sm:text-sm tracking-wide hover:from-slate-500 hover:via-slate-600 hover:to-slate-700 shadow-lg shadow-slate-500/40 transition-all duration-300 backdrop-blur-sm flex items-center gap-1.5 sm:gap-2'>
                                  <Icon
                                    icon='heroicons-outline:building-office'
                                    className='w-3 h-3 sm:w-4 sm:h-4'
                                  />
                                  {lastCompletedNotification.hallName}
                                </div>
                              )}
                            </div>

                            <div className='flex items-center gap-2 sm:gap-3'>
                              <div className='px-3 py-1.5 sm:px-5 sm:py-2.5 bg-gradient-to-r from-violet-600 via-purple-600 to-violet-700 text-white rounded-full font-bold text-xs sm:text-sm tracking-wide hover:from-violet-500 hover:via-purple-500 hover:to-violet-600 shadow-lg shadow-violet-500/40 transition-all duration-300 backdrop-blur-sm'>
                                {lastCompletedNotification?.repeatCount || 1}x
                              </div>
                            </div>
                          </motion.div>

                          <CardContent className='p-4 sm:p-8 md:p-12'>
                            {lastCompletedNotification && (
                              <div className='space-y-4 sm:space-y-6'>
                                <motion.div
                                  className='text-center'
                                  variants={{
                                    hidden: { opacity: 0, y: 40 },
                                    visible: {
                                      opacity: 1,
                                      y: 0,
                                      transition: {
                                        duration: 0.8,
                                        ease: 'easeOut',
                                        type: 'spring',
                                        stiffness: 80,
                                      },
                                    },
                                  }}
                                >
                                  <h2 className='text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight text-gray-900 mb-3 sm:mb-4 tracking-tight'>
                                    {lastCompletedNotification.title ||
                                      lastCompletedNotification.content}
                                  </h2>

                                  <div className='flex justify-center'>
                                    <div className='w-20 sm:w-32 h-0.5 sm:h-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full'></div>
                                  </div>
                                </motion.div>

                                <motion.div
                                  className='bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-10 shadow-lg border border-gray-100 mt-4 sm:mt-8'
                                  variants={{
                                    hidden: { opacity: 0, y: 30, scale: 0.95 },
                                    visible: {
                                      opacity: 1,
                                      y: 0,
                                      scale: 1,
                                      transition: {
                                        duration: 0.7,
                                        ease: 'easeOut',
                                        type: 'spring',
                                        stiffness: 90,
                                      },
                                    },
                                  }}
                                >
                                  <motion.p
                                    className='text-base sm:text-xl md:text-2xl leading-relaxed text-gray-800'
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5, duration: 0.6 }}
                                  >
                                    {lastCompletedNotification.content}
                                  </motion.p>
                                </motion.div>

                                <motion.div
                                  className='flex justify-center items-center mt-4 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200'
                                  variants={{
                                    hidden: { opacity: 0, y: 20 },
                                    visible: {
                                      opacity: 1,
                                      y: 0,
                                      transition: {
                                        duration: 0.6,
                                        ease: 'easeOut',
                                        delay: 0.3,
                                      },
                                    },
                                  }}
                                >
                                  <div className='flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500'>
                                    <div className='w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500'></div>
                                    {new Date(
                                      lastCompletedNotification.createdAt
                                    ).toLocaleString('vi-VN')}
                                  </div>
                                </motion.div>
                              </div>
                            )}
                          </CardContent>
                        </motion.div>
                      </Card>
                    </motion.div>
                  )}

                {/* Empty state */}
                {!currentNotification &&
                  queue.length === 0 &&
                  !isReading &&
                  !lastCompletedNotification && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className='w-full'
                    >
                      <Card className='border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950/90 backdrop-blur-2xl shadow-2xl relative rounded-2xl sm:rounded-3xl'>
                        <CardContent className='p-6 sm:p-8 md:p-12 text-center'>
                          <div className='mb-3 sm:mb-4 md:mb-6 flex justify-center'>
                            <motion.div
                              animate={{
                                scale: [1, 1.1, 1],
                                rotate: [0, 5, -5, 0],
                              }}
                              transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: 'easeInOut',
                              }}
                              className='bg-slate-800 p-3 sm:p-4 md:p-6 rounded-full shadow-lg shadow-blue-500/30 border border-slate-700 relative'
                            >
                              <motion.div
                                className='absolute inset-0 rounded-full bg-blue-500/20 animate-ping'
                                style={{ animationDuration: '2s' }}
                              />
                              <Icon
                                icon='heroicons-outline:bell-slash'
                                className='h-8 w-8 sm:h-12 sm:w-12 md:h-16 md:w-16 text-slate-300 relative z-10'
                              />
                            </motion.div>
                          </div>
                          <h3 className='text-lg sm:text-xl md:text-3xl font-bold text-white mb-2 sm:mb-3 md:mb-4'>
                            Đang chờ nhận thông báo
                          </h3>
                          <p className='text-slate-300 text-sm sm:text-base md:text-lg mb-4 sm:mb-6 md:mb-8'>
                            Hệ thống đang sẵn sàng để nhận và phát thông báo
                          </p>
                          <div className='flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 md:gap-4'>
                            {isConnected ? (
                              <div className='flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 md:px-6 md:py-3 bg-green-500/20 text-green-300 border border-green-500/40 shadow-lg shadow-green-500/20 backdrop-blur-sm rounded-full'>
                                <div className='relative'>
                                  <div className='absolute inset-0 bg-green-500 animate-ping opacity-60 rounded-full'></div>
                                  <Icon
                                    icon='heroicons-outline:signal'
                                    className='h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 relative'
                                  />
                                </div>
                                <span className='font-medium text-xs sm:text-sm'>
                                  Đã kết nối
                                </span>
                              </div>
                            ) : (
                              <div className='flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 md:px-6 md:py-3 bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-lg shadow-blue-500/20 backdrop-blur-sm rounded-full'>
                                <div className='relative'>
                                  <Icon
                                    icon='heroicons-outline:arrow-path'
                                    className='h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 relative animate-spin'
                                  />
                                </div>
                                <span className='font-medium text-xs sm:text-sm'>
                                  Đang kết nối...
                                </span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
              </AnimatePresence>
            </div>

            {/* Hall Info - bottom-left */}
            {!hallLoading && halls.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -50, y: 50 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className='absolute bottom-4 left-4 z-20'
              >
                <Card className='bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-md border border-slate-600/40 shadow-2xl rounded-2xl'>
                  <CardContent className='p-4'>
                    <div className='flex justify-center gap-3 overflow-x-auto'>
                      {halls.map((hall) => {
                        return (
                          <motion.div
                            key={hall.hallId}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className='bg-gradient-to-br from-slate-800/80 to-slate-900/90 backdrop-blur-sm rounded-xl p-4 border border-slate-600/40 min-w={[220]} flex-shrink-0 shadow-xl hover:shadow-2xl transition-all duration-300'
                          >
                            <div className='text-center mb-3'>
                              <div className='flex items-center justify-center gap-1 mb-1'>
                                <div className='w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse'></div>
                                <span className='text-xs text-green-400 font-medium'>
                                  HOẠT ĐỘNG
                                </span>
                              </div>
                              <h3 className='font-bold text-white text-base tracking-wide'>
                                HỘI TRƯỜNG {hall.hallName}
                              </h3>
                            </div>

                            <div className='text-center space-y-3'>
                              <div className='inline-flex items-center justify-center'>
                                <div className='bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-full shadow-lg'>
                                  <span className='text-sm font-bold'>
                                    PHIÊN SỐ {hall.sessionNumber}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Right: Completed list */}
          <div className='col-span-1 lg:col-span-1 hidden lg:flex flex-col'>
            <div className='bg-gradient-to-br from-slate-800/50 via-slate-800/50 to-slate-900/50 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-slate-600/40 p-3 sm:p-4 h-full overflow-hidden flex flex-col'>
              <div className='flex items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-500/40'>
                <h3 className='text-sm font-bold text-slate-200'>
                  Thông Báo Đã Phát
                </h3>
                <Badge className='bg-gradient-to-r from-slate-700/80 to-slate-800/80 text-slate-200 border border-slate-500/40 text-xs px-3 py-0.5 rounded-full font-semibold'>
                  {completedNotifications.length}
                </Badge>
              </div>

              <div
                className='flex-1 overflow-hidden pr-2 notification-container'
                style={{ direction: 'rtl' as any }}
              >
                <div className='space-y-3' style={{ direction: 'ltr' as any }}>
                  {completedNotifications.length > 0 ? (
                    <AnimatePresence mode='popLayout' initial={false}>
                      {completedNotifications
                        .slice()
                        .reverse()
                        .slice(0, maxVisibleNotifications)
                        .map((item, index) => {
                          return (
                            <motion.div
                              key={item.id}
                              initial={{
                                opacity: 0,
                                x: 50,
                                scale: 0.9,
                                y: -20,
                              }}
                              animate={{ opacity: 1, x: 0, scale: 1, y: 0 }}
                              exit={{
                                opacity: 0,
                                x: -50,
                                scale: 0.8,
                                height: 0,
                              }}
                              transition={{
                                duration: 0.4,
                                delay: index * 0.08,
                                ease: [0.4, 0, 0.2, 1],
                              }}
                              layout
                              className={cn(
                                'p-4 rounded-2xl border-2 backdrop-blur-sm transition-all opacity-70',
                                item.priority === 1 &&
                                  'bg-red-50/10 border-red-500/30 hover:bg-red-50/20 hover:border-red-500/50',
                                item.priority === 2 &&
                                  'bg-yellow-50/10 border-amber-500/30 hover:bg-yellow-50/20 hover:border-amber-500/50',
                                item.priority === 3 &&
                                  'bg-green-50/10 border-emerald-500/30 hover:bg-green-50/20 hover:border-emerald-500/50'
                              )}
                            >
                              <div className='flex items-center justify-between mb-2'>
                                <Badge
                                  className={cn(
                                    'text-xs px-3 py-0.5 rounded-full',
                                    item.priority === 1 &&
                                      'bg-red-500/20 text-red-300',
                                    item.priority === 2 &&
                                      'bg-amber-500/20 text-amber-300',
                                    item.priority === 3 &&
                                      'bg-emerald-500/20 text-emerald-300'
                                  )}
                                >
                                  {item.priority === 1
                                    ? 'CAO'
                                    : item.priority === 2
                                    ? 'TRUNG BÌNH'
                                    : 'THẤP'}
                                </Badge>
                                <div className='flex items-center gap-2'>
                                  <span className='text-xs text-slate-400'>
                                    {item.repeatCount}x
                                  </span>
                                  <Icon
                                    icon='heroicons-outline:check-circle'
                                    className='w-3 h-3 text-green-400'
                                  />
                                </div>
                              </div>
                              <p className='text-xs font-semibold text-white mb-1 line-clamp-1'>
                                {item.title}
                              </p>
                              <p className='text-xs text-slate-300 line-clamp-2'>
                                {item.content}
                              </p>
                              <div className='mt-2 text-xs text-slate-500'>
                                {new Date(item.completedAt).toLocaleTimeString(
                                  'vi-VN'
                                )}
                              </div>
                            </motion.div>
                          );
                        })}

                      {completedNotifications.length >
                        maxVisibleNotifications && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className='text-center py-2'
                        >
                          <div className='text-xs text-slate-400 bg-slate-700/50 rounded-lg px-3 py-2'>
                            +
                            {completedNotifications.length -
                              maxVisibleNotifications}{' '}
                            thông báo khác
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  ) : (
                    <div className='text-center py-4 text-slate-400'>
                      <Icon
                        icon='heroicons-outline:clock'
                        className='w-8 h-8 mx-auto mb-2 opacity-50'
                      />
                      <p className='text-xs'>Chưa có thông báo nào được phát</p>
                    </div>
                  )}
                </div>
              </div>

              {/* (Tùy chọn) thanh điều khiển nhỏ cho TTS tại màn hình này */}
              {/* <div className='mt-3 pt-3 border-t border-slate-600/40 flex items-center justify-between gap-3'>
                <div className='text-xs text-slate-300'>
                  TTS:&nbsp;
                  <span
                    className={cn(
                      enabled ? 'text-green-400' : 'text-slate-400'
                    )}
                  >
                    {enabled ? 'BẬT' : 'TẮT'}
                  </span>
                  &nbsp;| Console:&nbsp;
                  <span
                    className={cn(
                      consoleOnly ? 'text-yellow-300' : 'text-slate-400'
                    )}
                  >
                    {consoleOnly ? 'ON' : 'OFF'}
                  </span>
                </div>
                <div className='flex gap-2'>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => setEnabled((v) => !v)}
                  >
                    {enabled ? 'Tắt đọc' : 'Bật đọc'}
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => setConsoleOnly((v) => !v)}
                  >
                    Console only: {consoleOnly ? 'ON' : 'OFF'}
                  </Button>
                  <Button size='sm' variant='outline' onClick={stopAll}>
                    Dừng đọc
                  </Button>
                </div>
              </div> */}
            </div>
          </div>
          {/* End Right */}
        </div>
      </div>
    </div>
  );
}
