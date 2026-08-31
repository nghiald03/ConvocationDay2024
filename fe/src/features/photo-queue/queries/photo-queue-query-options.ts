import { queryOptions } from '@tanstack/react-query';
import {
  getPhotoQueueAuditLogs,
  getActivePhotoQueueSession,
  getPhotoQueuePublicState,
  getPhotoQueueSessions,
  getPhotoQueueStats,
} from '../api/photo-queue-api';

export const photoQueueSessionsQueryOptions = queryOptions({
  queryKey: ['photo-queue', 'sessions'],
  queryFn: getPhotoQueueSessions,
  staleTime: 60_000,
});

export const activePhotoQueueSessionQueryOptions = queryOptions({
  queryKey: ['photo-queue', 'active-session'],
  queryFn: getActivePhotoQueueSession,
  refetchInterval: 3000,
});

export function photoQueuePublicStateQueryOptions(photoSessionId?: string) {
  return queryOptions({
    queryKey: ['photo-queue', 'public-state', photoSessionId ?? 'active'],
    queryFn: () => getPhotoQueuePublicState(photoSessionId),
    refetchInterval: 2000,
  });
}

export function photoQueueStatsQueryOptions(photoSessionId: string) {
  return queryOptions({
    queryKey: ['photo-queue', 'stats', photoSessionId],
    queryFn: () => getPhotoQueueStats(photoSessionId),
    enabled: Boolean(photoSessionId),
    refetchInterval: 3000,
  });
}

export function photoQueueAuditLogsQueryOptions(photoSessionId: string) {
  return queryOptions({
    queryKey: ['photo-queue', 'audit-logs', photoSessionId],
    queryFn: () => getPhotoQueueAuditLogs(photoSessionId),
    enabled: Boolean(photoSessionId),
    refetchInterval: 3000,
  });
}
