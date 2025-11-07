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
import { statisticsAPI, type ActiveHallSummary } from '@/config/axios';
import { set } from 'lodash';

export default function NotificationDisplayLitePage() {
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

  // === HALL OVERVIEW (đã vá 404 => [] và không giữ data cũ) ===

  const [hallsList, setHallsList] = useState<ActiveHallSummary[]>([]);

  const {
    data: halls,
    isFetching: hallsFetching,
    error: hallsError,
  } = useQuery<ActiveHallSummary[]>({
    queryKey: ['hall-overview'],
    queryFn: async () => {
      const res = await statisticsAPI.getHallOverview();
      setHallsList(res?.data?.data ?? []);
      return res?.data?.data ?? [];
    },

    refetchOnMount: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  const queryClient = useQueryClient();
  const QUEUE_KEY = useMemo(() => ['tts-queue'], []);
  const COMPLETED_KEY = useMemo(() => ['tts-completed'], []);

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

  const sortNotifications = useCallback((notifs: any[]) => {
    return [...notifs].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
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

  const getPriorityConfig = (priority: number) => {
    switch (priority) {
      case 1:
        return {
          bg: 'bg-gradient-to-br from-red-50 to-rose-50',
          border: 'border-red-500',
          dot: 'bg-red-500',
          badge: 'bg-red-100 text-red-700',
          icon: 'heroicons:exclamation-triangle',
          iconColor: 'text-red-500',
          title: 'Khẩn cấp',
        };
      case 2:
        return {
          bg: 'bg-gradient-to-br from-amber-50 to-yellow-50',
          border: 'border-amber-500',
          dot: 'bg-amber-500',
          badge: 'bg-amber-100 text-amber-700',
          icon: 'heroicons:exclamation-circle',
          iconColor: 'text-amber-500',
          title: 'Quan trọng',
        };
      case 3:
        return {
          bg: 'bg-gradient-to-br from-blue-50 to-cyan-50',
          border: 'border-blue-500',
          dot: 'bg-blue-500',
          badge: 'bg-blue-100 text-blue-700',
          icon: 'heroicons:information-circle',
          iconColor: 'text-blue-500',
          title: 'Thông thường',
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-slate-50 to-gray-50',
          border: 'border-slate-400',
          dot: 'bg-slate-400',
          badge: 'bg-slate-100 text-slate-700',
          icon: 'heroicons:bell',
          iconColor: 'text-slate-500',
          title: 'Thông báo',
        };
    }
  };

  if (error) {
    return (
      <div className='min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center p-6'>
        <div className='max-w-xl w-full text-center'>
          <div className='bg-red-500/10 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center'>
            <Icon
              icon='heroicons:exclamation-triangle'
              className='w-10 h-10 text-red-400'
            />
          </div>
          <h2 className='text-3xl font-bold mb-3'>Lỗi ứng dụng</h2>
          <p className='text-red-400 mb-8 text-lg'>{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className='font-semibold px-6 py-3'
          >
            <Icon icon='heroicons:arrow-path' className='w-5 h-5 mr-2' />
            Tải lại trang
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative'>
      {/* Decorative elements */}
      <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none' />
      <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent pointer-events-none' />

      {/* Time Display */}
      {isFullscreen && (
        <div className='fixed top-6 left-6 z-50'>
          <Button
            onClick={toggleFullscreen}
            className='bg-slate-800/80 backdrop-blur-sm text-white px-5 py-3 rounded-xl border border-slate-600/50 shadow-lg hover:bg-slate-700/80'
          >
            <Icon
              icon='heroicons:clock'
              className='w-6 h-6 mr-3 text-blue-400'
            />
            <span className='font-mono text-xl font-semibold'>
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
      <div className='relative z-10 p-4 sm:p-6 md:p-8 min-h-screen flex flex-col'>
        <div className='grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1'>
          {/* Main Notification Area */}
          <div className='col-span-1 lg:col-span-4 flex flex-col'>
            {/* Hall Info Cards - Top */}
            {hallsList &&
              (hallsList.length > 0 ? (
                <div className='mb-6'>
                  <div className='flex justify-center gap-4 overflow-x-auto pb-2'>
                    {hallsList.map((hall: ActiveHallSummary) => (
                      <Card
                        key={hall.hallId}
                        className='bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-xl shadow-xl min-w-[200px] flex-shrink-0'
                      >
                        <CardContent className='p-4'>
                          <div className='text-center'>
                            <div className='flex items-center justify-center gap-2 mb-2'>
                              <div className='w-2 h-2 bg-green-400 rounded-full' />
                              <span className='text-xs text-green-400 font-semibold uppercase'>
                                Đang mở cổng checkin
                              </span>
                            </div>
                            <h3 className='font-bold text-white text-base mb-3'>
                              HỘI TRƯỜNG {hall.hallName}
                            </h3>
                            <div className='inline-flex items-center justify-center'>
                              <div className='bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-full shadow-lg'>
                                <span className='text-sm font-bold'>
                                  PHIÊN SỐ {hall.sessionNumber}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className='mb-6 flex justify-center'>
                  <div className='text-sm text-slate-400 bg-slate-800/50 border border-slate-700 rounded-full px-3 py-1'>
                    Hiện không có hội trường nào đang hoạt động
                  </div>
                </div>
              ))}

            {/* Notification Card - Centered */}
            <div className='flex-1 flex items-center justify-center'>
              <div className='w-full max-w-5xl px-4'>
                {currentNotification ? (
                  <Card
                    className={cn(
                      'border-2 rounded-3xl shadow-2xl backdrop-blur-sm overflow-hidden',
                      getPriorityConfig(currentNotification.priority).bg,
                      getPriorityConfig(currentNotification.priority).border
                    )}
                  >
                    <CardContent className='p-8 sm:p-10'>
                      <div className='flex items-start justify-between mb-6'>
                        <div className='flex items-center gap-4'>
                          <div
                            className={cn(
                              'w-12 h-12 rounded-2xl flex items-center justify-center',
                              getPriorityConfig(currentNotification.priority)
                                .badge
                            )}
                          >
                            <Icon
                              icon={
                                getPriorityConfig(currentNotification.priority)
                                  .icon
                              }
                              className={cn(
                                'w-7 h-7',
                                getPriorityConfig(currentNotification.priority)
                                  .iconColor
                              )}
                            />
                          </div>
                          <div>
                            <div className='text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1'>
                              {
                                getPriorityConfig(currentNotification.priority)
                                  .title
                              }
                            </div>
                            <div className='flex items-center gap-2'>
                              <span
                                className={cn(
                                  'inline-block w-2 h-2 rounded-full',
                                  isReading &&
                                    getPriorityConfig(
                                      currentNotification.priority
                                    ).dot
                                )}
                              />
                              <span className='text-xs text-slate-500 font-medium'>
                                {isReading ? 'Đang phát...' : 'Đã sẵn sàng'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge
                          className={cn(
                            'text-xs font-bold px-3 py-1.5 rounded-full',
                            getPriorityConfig(currentNotification.priority)
                              .badge
                          )}
                        >
                          Mức {currentNotification.priority}
                        </Badge>
                      </div>

                      <h1 className='text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-slate-900 leading-tight'>
                        {currentNotification.title || 'Thông báo hệ thống'}
                      </h1>

                      <p className='text-lg sm:text-xl md:text-2xl leading-relaxed text-slate-800 mb-8'>
                        {currentNotification.content}
                      </p>

                      <div className='flex items-center justify-between pt-6 border-t-2 border-slate-200'>
                        <div className='flex items-center gap-2 text-sm text-slate-500'>
                          <Icon icon='heroicons:calendar' className='w-4 h-4' />
                          <span>
                            {new Date(
                              currentNotification.createdAt
                            ).toLocaleString('vi-VN', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                        {currentNotification.hallName && (
                          <div className='flex items-center gap-2 text-sm text-slate-500'>
                            <Icon
                              icon='heroicons:map-pin'
                              className='w-4 h-4'
                            />
                            <span>{currentNotification.hallName}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : lastCompletedNotification ? (
                  <Card
                    className={cn(
                      'border-2 rounded-3xl shadow-xl backdrop-blur-sm overflow-hidden opacity-75',
                      getPriorityConfig(lastCompletedNotification.priority).bg,
                      getPriorityConfig(lastCompletedNotification.priority)
                        .border
                    )}
                  >
                    <CardContent className='p-6 sm:p-8'>
                      <div className='flex items-start justify-between mb-4'>
                        <div className='flex items-center gap-3'>
                          <div
                            className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center',
                              getPriorityConfig(
                                lastCompletedNotification.priority
                              ).badge
                            )}
                          >
                            <Icon
                              icon='heroicons:check-circle'
                              className={cn(
                                'w-6 h-6',
                                getPriorityConfig(
                                  lastCompletedNotification.priority
                                ).iconColor
                              )}
                            />
                          </div>
                          <div>
                            <div className='text-xs font-semibold text-slate-600 uppercase tracking-wide'>
                              Thông báo gần nhất
                            </div>
                          </div>
                        </div>
                        <Badge
                          className={cn(
                            'text-xs font-bold px-2.5 py-1 rounded-full',
                            getPriorityConfig(
                              lastCompletedNotification.priority
                            ).badge
                          )}
                        >
                          Mức {lastCompletedNotification.priority}
                        </Badge>
                      </div>

                      <div className='text-xl sm:text-2xl font-bold mb-3 text-slate-900'>
                        {lastCompletedNotification.title || 'Thông báo'}
                      </div>
                      <div className='text-base sm:text-lg text-slate-800'>
                        {lastCompletedNotification.content}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className='border-2 border-dashed border-slate-700 rounded-3xl bg-slate-800/50 backdrop-blur-sm shadow-xl'>
                    <CardContent className='p-12 text-center'>
                      <div className='w-20 h-20 mx-auto mb-6 rounded-full bg-slate-700/50 flex items-center justify-center'>
                        <Icon
                          icon='heroicons:bell-slash'
                          className='w-10 h-10 text-slate-400'
                        />
                      </div>
                      <h3 className='text-2xl font-bold text-slate-300 mb-2'>
                        Đang chờ thông báo
                      </h3>
                      <p className='text-slate-400'>
                        Hệ thống sẵn sàng phát thông báo mới
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Recently Completed */}
          <div className='col-span-1 lg:col-span-1'>
            <div className='bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700 p-5 shadow-xl h-full flex flex-col'>
              <div className='flex items-center gap-2 mb-5'>
                <Icon
                  icon='heroicons:clock'
                  className='w-5 h-5 text-slate-400'
                />
                <h3 className='text-base font-bold text-slate-200'>
                  Lịch sử phát
                </h3>
              </div>

              <div className='flex-1 overflow-y-auto space-y-3'>
                {completedFromCache.length === 0 ? (
                  <div className='text-center py-8'>
                    <Icon
                      icon='heroicons:inbox'
                      className='w-12 h-12 mx-auto mb-3 text-slate-600'
                    />
                    <p className='text-sm text-slate-400'>
                      Chưa có thông báo nào
                    </p>
                  </div>
                ) : (
                  completedFromCache
                    .slice(-maxVisibleNotifications)
                    .reverse()
                    .map((n: any) => {
                      const config = getPriorityConfig(n.priority);
                      return (
                        <Card
                          key={n.id}
                          className={cn(
                            'border rounded-xl overflow-hidden shadow-md hover:shadow-lg',
                            config.bg,
                            config.border
                          )}
                        >
                          <CardContent className='p-4'>
                            <div className='flex items-start justify-between mb-2'>
                              <div className='flex items-center gap-2 flex-1 min-w-0'>
                                <span
                                  className={cn(
                                    'inline-block w-2.5 h-2.5 rounded-full flex-shrink-0',
                                    config.dot
                                  )}
                                />
                                <span className='text-sm font-bold text-slate-900 truncate'>
                                  {n.title || 'Thông báo'}
                                </span>
                              </div>
                            </div>
                            <p className='text-xs text-slate-700 line-clamp-2 mb-2'>
                              {n.content}
                            </p>
                            <div className='flex items-center gap-2 text-[10px] text-slate-500'>
                              <Icon
                                icon='heroicons:check-circle'
                                className='w-3 h-3'
                              />
                              <span>
                                {new Date(n.completedAt).toLocaleTimeString(
                                  'vi-VN',
                                  {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }
                                )}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className='fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-md border-t border-slate-800 shadow-2xl z-50'>
        <div className='px-6 py-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-6'>
              <div className='flex items-center gap-3'>
                <div className='relative'>
                  <span
                    className={cn(
                      'inline-block w-3 h-3 rounded-full',
                      isConnected ? 'bg-green-500' : 'bg-red-500'
                    )}
                  />
                  {isConnected && (
                    <span className='absolute inset-0 w-3 h-3 rounded-full bg-green-500 opacity-75'></span>
                  )}
                </div>
                <div>
                  <div className='text-xs text-slate-400 font-medium'>
                    Trạng thái
                  </div>
                  <div className='text-sm font-bold text-slate-200'>
                    {connectionState}
                  </div>
                </div>
              </div>

              <div className='h-8 w-px bg-slate-700' />

              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center'>
                  <Icon
                    icon='heroicons:queue-list'
                    className='w-5 h-5 text-blue-400'
                  />
                </div>
                <div>
                  <div className='text-xs text-slate-400 font-medium'>
                    Hàng đợi
                  </div>
                  <div className='text-sm font-bold text-slate-200'>
                    {queue.length} thông báo
                  </div>
                </div>
              </div>
            </div>

            {/* <Button
              onClick={stopAll}
              className='bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg'
            >
              <Icon icon='heroicons:stop' className='w-5 h-5 mr-2' />
              Dừng phát
            </Button> */}
          </div>
        </div>
      </div>
    </div>
  );
}
