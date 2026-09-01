import { describe, expect, test } from 'bun:test';
import {
  getPhotoQueueStatsPage,
  getPreviousWaitingPhotoQueueNumber,
} from '@/features/photo-queue/model/photo-queue-stats-view';
import type { PhotoQueueEntry } from '@/features/photo-queue/model/photo-queue';

const entries: PhotoQueueEntry[] = [
  { queueNumber: 1, photoStatus: 'PHOTOGRAPHED', studentCode: 'SV003', fullName: 'An', major: null },
  { queueNumber: 2, photoStatus: 'WAITING', studentCode: 'SV002', fullName: 'Bình', major: null },
  { queueNumber: 3, photoStatus: 'WAITING', studentCode: 'SV001', fullName: 'Chi', major: null },
  { queueNumber: 4, photoStatus: 'CANCELLED', studentCode: 'SV004', fullName: 'Dung', major: null },
];

describe('photo queue stats view', () => {
  test('treats absent as a terminal status separate from waiting', () => {
    const absent: PhotoQueueEntry = {
      queueNumber: 5,
      photoStatus: 'ABSENT',
      studentCode: 'SV005',
      fullName: 'Em',
      major: null,
    };

    expect(getPreviousWaitingPhotoQueueNumber([...entries, absent], 6)).toBe(3);
    expect(
      getPhotoQueueStatsPage([...entries, absent], {
        search: 'vang',
        sortField: 'queueNumber',
        sortDirection: 'asc',
        page: 1,
        pageSize: 10,
      }).entries,
    ).toEqual([absent]);
  });

  test('finds the nearest previous waiting number from loaded stats', () => {
    expect(getPreviousWaitingPhotoQueueNumber(entries, 4)).toBe(3);
    expect(getPreviousWaitingPhotoQueueNumber(entries, 2)).toBeNull();
  });

  test('searches, sorts and paginates entries deterministically', () => {
    const result = getPhotoQueueStatsPage(entries, {
      search: 'sv0',
      sortField: 'studentCode',
      sortDirection: 'asc',
      page: 2,
      pageSize: 2,
    });

    expect(result.entries.map((entry) => entry.studentCode)).toEqual(['SV003', 'SV004']);
    expect(result.totalEntries).toBe(4);
    expect(result.totalPages).toBe(2);
    expect(result.page).toBe(2);
  });
});
