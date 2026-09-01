import { describe, expect, test } from 'bun:test';
import { getPhotoQueueRealtimeQueryKeys } from '@/features/photo-queue/queries/use-photo-queue-realtime';

describe('photo queue realtime query routing', () => {
  test('refreshes only the selected session plus changed session metadata', () => {
    expect(
      getPhotoQueueRealtimeQueryKeys(
        {
          photoSessionIds: [7],
          sessionsChanged: true,
          activeSessionChanged: true,
        },
        '7',
      ),
    ).toEqual([
      ['photo-queue', 'sessions'],
      ['photo-queue', 'active-session'],
      ['photo-queue', 'public-state', '7'],
      ['photo-queue', 'stats', '7'],
      ['photo-queue', 'audit-logs', '7'],
    ]);
  });

  test('does not refresh a coordinator session unrelated to the event', () => {
    expect(
      getPhotoQueueRealtimeQueryKeys({ photoSessionIds: [8] }, '7'),
    ).toEqual([]);
  });
});
