'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import type { NotificationResponse } from '@/config/axios';
import { useElevenLabsTTS } from '@/hooks/useElevenLabsTTS';
import { useSignalRContext } from '../SignalRContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Lightweight notification display without animations for low-end devices
export default function NotificationDisplayLitePage() {
  // Core UI / state
  const [notifications, setNotifications] = useState<NotificationResponse[]>(
    []
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastCompletedNotification, setLastCompletedNotification] =
    useState<any>(null);
  const [maxVisibleNotifications] = useState(5);

  // SignalR context (provided by parent layout)
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
  } catch (e) {
    console.error('SignalR Context Error:', e);
    setError('SignalR Context initialization failed');
    connection = null;
    isConnected = false;
    connectionState = 'Disconnected';
    isFullscreen = false;
    toggleFullscreen = () => {};
  }

  // Clock tick – keep very light (1s)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // TTS wrapper (no UI animations, just audio)
  const [enabled] = useState(true);
  const [consoleOnly] = useState(false);
  const { speak: xiSpeak, stop: xiStop } = useElevenLabsTTS(() => {
    setIsReading(false);
  });
  const stopAll = useCallback(() => xiStop(), [xiStop]);
  const speak = useCallback(
    (text: string): Promise<void> => {
      if (!enabled) return Promise.resolve();
      if (consoleOnly) {
        // eslint-disable-next-line no-console
        console.log('[TTS][DEBUG]', text);
        return Promise.resolve();
      }
      return xiSpeak(text, {
        repeat: 1,
        chimeUrl: '/sounds/Notification Alert 01.wav',
        chimeVolume: 0.5,
        gain: 2.0,
        fadeInMsChime: 0,
        fadeInMsTTS: 0,
      });
    },
    [enabled, consoleOnly, xiSpeak]
  );

  // Query client and queues
  const queryClient = useQueryClient();
  const QUEUE_KEY = useMemo(() => ['tts-queue'], []);
  const COMPLETED_KEY = useMemo(() => ['tts-completed'], []);

  // Seed caches if missing
  useEffect(() => {
    if (!queryClient.getQueryData(QUEUE_KEY)) {
      queryClient.setQueryData(QUEUE_KEY, [] as any[]);
    }
    if (!queryClient.getQueryData(COMPLETED_KEY)) {
      queryClient.setQueryData(COMPLETED_KEY, [] as any[]);
    }
  }, [queryClient, QUEUE_KEY, COMPLETED_KEY]);

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

  // Listen for incoming broadcasts and push into queue (dedup simple)
  const sortNotifications = useCallback((notifs: any[]) => {
    return [...notifs].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority; // 1 highest
      const timeA = new Date(a.createdAt || a.broadcastAt || 0).getTime();
      const timeB = new Date(b.createdAt || b.broadcastAt || 0).getTime();
      return timeA - timeB;
    });
  }, []);

  useEffect(() => {
    if (!connection) return;
    const handler = (data: any) => {
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
        const exists = prev.some(
          (x) =>
            (x.notificationId ?? x.id) === notif.notificationId &&
            (x.broadcastAt || x.createdAt) ===
              (notif.broadcastAt || notif.createdAt) &&
            x.content === notif.content
        );
        if (exists) return prev;
        return sortNotifications([...prev, notif]);
      });
    };
    connection.on('ReceiveTTSBroadcast', handler);
    return () => {
      connection.off('ReceiveTTSBroadcast', handler);
    };
  }, [connection, queryClient, QUEUE_KEY, sortNotifications]);

  // Read logic (no animation)
  const readNotificationWithRepeat = useCallback(
    async (notification: any, currentRepeat: number) => {
      if (currentRepeat === 0) {
        queryClient.setQueryData(QUEUE_KEY, (prev: any[] = []) =>
          prev.filter((item) => item.id !== notification.id)
        );
      }

      setIsReading(true);
      setNotifications([notification]);
      setCurrentIndex(0);

      const textToRead = `Thông báo: ${notification.content}`;
      try {
        await speak(textToRead);
        const nextRepeat = currentRepeat + 1;
        if (nextRepeat >= notification.repeatCount) {
          setIsReading(false);
          setNotifications([]);
          setLastCompletedNotification({
            ...notification,
            completedAt: new Date().toISOString(),
          });
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
      } catch (e) {
        console.error('Error reading notification:', e);
        setIsReading(false);
        setNotifications([]);
      }
    },
    [COMPLETED_KEY, QUEUE_KEY, maxVisibleNotifications, queryClient, speak]
  );

  const processNextInQueue = useCallback(async () => {
    if (queue.length > 0 && !isReading) {
      const next = queue[0];
      await readNotificationWithRepeat(next, 0);
    }
  }, [queue, isReading, readNotificationWithRepeat]);

  // Drive queue processing
  useEffect(() => {
    if (queue.length > 0 && !isReading && notifications.length === 0) {
      processNextInQueue();
    }
  }, [queue.length, isReading, notifications.length, processNextInQueue]);

  useEffect(() => {
    if (queue.length > 0 && !isReading && notifications.length === 0) {
      const t = setTimeout(() => processNextInQueue(), 100);
      return () => clearTimeout(t);
    }
  }, [queue.length, isReading, notifications.length, processNextInQueue]);

  const currentNotification = notifications[currentIndex];

  // Simple helpers (no animated classes)
  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return 'bg-red-600';
      case 2:
        return 'bg-yellow-500';
      case 3:
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getBorderStyle = (priority: number) => {
    switch (priority) {
      case 1:
        return 'border-red-600';
      case 2:
        return 'border-amber-500';
      case 3:
        return 'border-emerald-500';
      default:
        return 'border-gray-300';
    }
  };

  // Error screen (simple)
  if (error) {
    return (
      <div className='min-h-screen w-full bg-black text-white flex items-center justify-center p-6'>
        <div className='max-w-xl w-full text-center'>
          <Icon
            icon='heroicons-outline:exclamation-triangle'
            className='w-10 h-10 mx-auto mb-4 text-red-400'
          />
          <h2 className='text-2xl font-bold mb-2'>Lỗi ứng dụng</h2>
          <p className='text-red-400 mb-6'>{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className='font-semibold'
          >
            Tải lại trang
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen w-full bg-slate-900 text-slate-100 relative'>
      {/* Minimal fullscreen time control */}
      {isFullscreen && (
        <div className='fixed top-3 left-3 z-50'>
          <Button
            onClick={toggleFullscreen}
            className='bg-slate-800 text-white px-4 py-2 rounded-md border border-slate-600'
          >
            <Icon icon='heroicons-outline:clock' className='w-5 h-5 mr-2' />
            <span className='font-mono text-lg'>
              {currentTime.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          </Button>
        </div>
      )}

      {/* Content */}
      <div className='p-3 sm:p-4 md:p-6'>
        <div className='grid grid-cols-1 lg:grid-cols-5 gap-3'>
          {/* Main area */}
          <div className='col-span-1 lg:col-span-4'>
            <div className='max-w-4xl mx-auto'>
              {currentNotification ? (
                <Card
                  className={cn(
                    'border-2 rounded-2xl bg-white text-slate-900',
                    getBorderStyle(currentNotification.priority)
                  )}
                >
                  <CardContent className='p-6'>
                    <div className='flex items-center justify-between mb-4'>
                      <div className='flex items-center gap-2'>
                        <span
                          className={cn(
                            'inline-block w-3 h-3 rounded-full',
                            getPriorityColor(currentNotification.priority)
                          )}
                        />
                        <span className='text-sm font-semibold text-slate-600'>
                          Thông báo
                        </span>
                      </div>
                      <Badge color='secondary' className='text-[11px]'>
                        Ưu tiên {currentNotification.priority}
                      </Badge>
                    </div>
                    <h1 className='text-2xl sm:text-3xl font-bold mb-3'>
                      {currentNotification.title || 'Thông báo hệ thống'}
                    </h1>
                    <p className='text-base sm:text-lg leading-relaxed text-slate-800'>
                      {currentNotification.content}
                    </p>
                    <div className='mt-4 pt-4 border-t text-xs text-slate-500'>
                      {new Date(currentNotification.createdAt).toLocaleString(
                        'vi-VN'
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : lastCompletedNotification ? (
                <Card
                  className={cn(
                    'border rounded-xl bg-white text-slate-900',
                    getBorderStyle(lastCompletedNotification.priority)
                  )}
                >
                  <CardContent className='p-5'>
                    <div className='flex items-center justify-between mb-3'>
                      <div className='flex items-center gap-2'>
                        <span
                          className={cn(
                            'inline-block w-2.5 h-2.5 rounded-full',
                            getPriorityColor(lastCompletedNotification.priority)
                          )}
                        />
                        <span className='text-xs font-semibold text-slate-600'>
                          Thông báo gần nhất
                        </span>
                      </div>
                      <Badge color='secondary' className='text-[11px]'>
                        Ưu tiên {lastCompletedNotification.priority}
                      </Badge>
                    </div>
                    <div className='text-lg font-semibold mb-1'>
                      {lastCompletedNotification.title || 'Thông báo'}
                    </div>
                    <div className='text-slate-800'>
                      {lastCompletedNotification.content}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className='border rounded-xl bg-white text-slate-900'>
                  <CardContent className='p-5'>
                    <div className='text-center text-slate-600'>
                      Đang chờ thông báo...
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Sidebar: recently completed */}
          <div className='col-span-1 lg:col-span-1'>
            <div className='space-y-3'>
              <div className='text-sm font-semibold text-slate-300'>
                Vừa phát
              </div>
              {completedFromCache.length === 0 && (
                <div className='text-xs text-slate-400'>Chưa có mục nào</div>
              )}
              {completedFromCache
                .slice(-maxVisibleNotifications)
                .map((n: any) => (
                  <Card
                    key={n.id}
                    className='border rounded-lg bg-white/95 text-slate-900'
                  >
                    <CardContent className='p-3'>
                      <div className='flex items-center justify-between mb-1'>
                        <span className='text-xs font-medium truncate'>
                          {n.title || 'Thông báo'}
                        </span>
                        <span
                          className={cn(
                            'inline-block w-2 h-2 rounded-full',
                            getPriorityColor(n.priority)
                          )}
                        />
                      </div>
                      <div className='text-xs text-slate-600 truncate'>
                        {n.content}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer status (minimal) */}
      <div className='fixed bottom-0 left-0 right-0 bg-slate-800 text-slate-200 text-xs px-3 py-2 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <span
            className={cn(
              'inline-block w-2 h-2 rounded-full',
              isConnected ? 'bg-green-500' : 'bg-red-500'
            )}
          />
          <span>Kết nối: {connectionState}</span>
        </div>
        <div className='flex items-center gap-3'>
          <span>Hàng đợi: {queue.length}</span>
          <Button
            color='secondary'
            size='sm'
            className='h-7 text-xs'
            onClick={stopAll}
          >
            Dừng phát
          </Button>
        </div>
      </div>
    </div>
  );
}
