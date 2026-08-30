import { describe, expect, test } from 'bun:test';
import { normalizeLedBachelorWindow } from '../src/features/led/model/normalize-led-bachelor-window';

describe('normalizeLedBachelorWindow', () => {
  test('normalizes legacy empty strings to null at the API boundary', () => {
    const bachelor = {
      studentCode: 'SE0001',
      fullName: 'Student One',
      mail: 'student@example.com',
      major: 'Software Engineering',
      image: '/avatar.webp',
      hallName: 'A',
      sessionNum: 1,
      chair: 'A01',
      chairParent: 'A02',
    };

    expect(
      normalizeLedBachelorWindow({
        bachelor1: bachelor,
        bachelor2: '',
        bachelor3: null,
      })
    ).toEqual({ bachelor1: bachelor, bachelor2: null, bachelor3: null });
  });

  test('preserves a missing response as undefined', () => {
    expect(normalizeLedBachelorWindow(undefined)).toBeUndefined();
  });
});
