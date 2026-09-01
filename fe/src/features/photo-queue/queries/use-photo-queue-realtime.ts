'use client';

import { useEffect } from 'react';
import { type QueryKey, useQueryClient } from '@tanstack/react-query';
import { useRealtime } from '@/lib/realtime/use-realtime';
import { photoQueueKeys } from './photo-queue-query-options';

export type PhotoQueueChanged = {
  photoSessionIds: number[];
  sessionsChanged?: boolean;
  activeSessionChanged?: boolean;
};

type RealtimeEnvelope<T> = {
  eventId: string;
  serverTimestamp: string;
  data: T;
};

export function getPhotoQueueRealtimeQueryKeys(
  event: PhotoQueueChanged,
  watchedPhotoSessionId?: string,
): QueryKey[] {
  const queryKeys: QueryKey[] = [];
  if (event.sessionsChanged) queryKeys.push(photoQueueKeys.sessions);
  if (event.activeSessionChanged) queryKeys.push(photoQueueKeys.activeSession);
  if (
    watchedPhotoSessionId &&
    event.photoSessionIds.includes(Number(watchedPhotoSessionId))
  ) {
    queryKeys.push(
      photoQueueKeys.publicState(watchedPhotoSessionId),
      photoQueueKeys.stats(watchedPhotoSessionId),
      photoQueueKeys.auditLogs(watchedPhotoSessionId),
    );
  }
  return queryKeys;
}

export function usePhotoQueueRealtime(watchedPhotoSessionId?: string) {
  const queryClient = useQueryClient();
  const { connection, isConnected } = useRealtime();

  useEffect(() => {
    if (!connection) return;
    const handleChanged = (event: RealtimeEnvelope<PhotoQueueChanged>) => {
      for (const queryKey of getPhotoQueueRealtimeQueryKeys(
        event.data,
        watchedPhotoSessionId,
      )) {
        void queryClient.invalidateQueries({ queryKey });
      }
    };

    connection.on('photo-queue:changed', handleChanged);
    return () => {
      connection.off('photo-queue:changed', handleChanged);
    };
  }, [connection, queryClient, watchedPhotoSessionId]);

  useEffect(() => {
    if (isConnected) {
      void queryClient.invalidateQueries({ queryKey: photoQueueKeys.root });
    }
  }, [isConnected, queryClient]);

  return { isConnected };
}
