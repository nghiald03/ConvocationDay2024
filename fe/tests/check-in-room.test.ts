import { describe, expect, test } from 'bun:test';
import { canCheckInRoom } from '../src/features/check-in/model/check-in-room';

describe('canCheckInRoom', () => {
  test('null means every room, including graduates without a room', () => {
    expect(canCheckInRoom(null, 'Phòng 101')).toBe(true);
    expect(canCheckInRoom(null, null)).toBe(true);
  });

  test('matches assigned rooms ignoring case and surrounding spaces', () => {
    expect(canCheckInRoom(['phòng 101'], ' PHÒNG 101 ')).toBe(true);
    expect(canCheckInRoom(['Phòng 101'], 'Phòng 102')).toBe(false);
  });

  test('denies when nothing is assigned, the room is empty, or rooms have not loaded', () => {
    expect(canCheckInRoom([], 'Phòng 101')).toBe(false);
    expect(canCheckInRoom(['Phòng 101'], null)).toBe(false);
    expect(canCheckInRoom(undefined, 'Phòng 101')).toBe(false);
  });
});
