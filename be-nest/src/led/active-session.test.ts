import { describe, expect, test } from 'bun:test';
import { type ActiveCandidate, pickActiveSessions } from './active-session.js';

const candidate = (hallId: number, sessionId: number, sessionNumber: number): ActiveCandidate => ({
  hallId,
  hallName: hallId === 3 ? 'Right' : 'Left',
  sessionId,
  sessionNumber,
  sessionInDay: sessionNumber,
  description: null,
});

describe('pickActiveSessions', () => {
  test('mỗi side một phiên; chưa thao tác gì thì lấy phiên số lớn nhất còn người đang chiếu', () => {
    const result = pickActiveSessions(
      [candidate(3, 7, 1), candidate(3, 8, 2), candidate(4, 7, 1)],
      new Map(),
    );
    expect(result.map((item) => [item.hallId, item.sessionId])).toEqual([
      [4, 7],
      [3, 8],
    ]);
  });

  test('ưu tiên phiên MC vừa thao tác, kể cả khi quay lại chiếu phiên trước', () => {
    const candidates = [candidate(3, 8, 2), candidate(3, 7, 1), candidate(3, 9, 3)];
    expect(pickActiveSessions(candidates, new Map([[3, 7]]))[0]?.sessionId).toBe(7);
  });

  test('phiên vừa thao tác không còn ai đang chiếu (đã reset) thì quay về phiên số lớn nhất', () => {
    expect(pickActiveSessions([candidate(3, 8, 2)], new Map([[3, 7]]))[0]?.sessionId).toBe(8);
  });

  test('không có ai đang chiếu thì trả về rỗng', () => {
    expect(pickActiveSessions([], new Map())).toEqual([]);
  });
});
