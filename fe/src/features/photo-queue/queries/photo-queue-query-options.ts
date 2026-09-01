import { queryOptions } from '@tanstack/react-query';
import {
  getPhotoQueueAuditLogs,
  getActivePhotoQueueSession,
  getPhotoQueuePublicState,
  getPhotoQueueSessions,
  getPhotoQueueStats,
} from '../api/photo-queue-api';

export const photoQueueKeys = {
  root: ['photo-queue'] as const,
  sessions: ['photo-queue', 'sessions'] as const,
  activeSession: ['photo-queue', 'active-session'] as const,
  publicState: (photoSessionId?: string) =>
    ['photo-queue', 'public-state', photoSessionId ?? 'active'] as const,
  stats: (photoSessionId: string) => ['photo-queue', 'stats', photoSessionId] as const,
  auditLogs: (photoSessionId: string) =>
    ['photo-queue', 'audit-logs', photoSessionId] as const,
};

export const photoQueueSessionsQueryOptions = queryOptions({
  queryKey: photoQueueKeys.sessions,
  queryFn: getPhotoQueueSessions,
  staleTime: 60_000,
});

export const activePhotoQueueSessionQueryOptions = queryOptions({
  queryKey: photoQueueKeys.activeSession,
  queryFn: getActivePhotoQueueSession,
});

export function photoQueuePublicStateQueryOptions(photoSessionId?: string) {
  return queryOptions({
    queryKey: photoQueueKeys.publicState(photoSessionId),
    queryFn: () => getPhotoQueuePublicState(photoSessionId),
  });
}

export function photoQueueStatsQueryOptions(photoSessionId: string) {
  return queryOptions({
    queryKey: photoQueueKeys.stats(photoSessionId),
    queryFn: () => getPhotoQueueStats(photoSessionId),
    enabled: Boolean(photoSessionId),
  });
}

export function photoQueueAuditLogsQueryOptions(photoSessionId: string) {
  return queryOptions({
    queryKey: photoQueueKeys.auditLogs(photoSessionId),
    queryFn: () => getPhotoQueueAuditLogs(photoSessionId),
    enabled: Boolean(photoSessionId),
  });
}
