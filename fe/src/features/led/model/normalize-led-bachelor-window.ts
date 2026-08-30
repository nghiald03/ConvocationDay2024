import type { Bachelor } from '@/features/bachelor/model/bachelor';
import type { LedBachelorWindow } from './led-bachelors';

export type RawLedBachelorWindow = {
  bachelor1: Bachelor | string | null;
  bachelor2: Bachelor | string | null;
  bachelor3: Bachelor | string | null;
};

function normalizeBachelor(value: Bachelor | string | null) {
  return typeof value === 'object' && value !== null ? value : null;
}

export function normalizeLedBachelorWindow(
  value?: RawLedBachelorWindow
): LedBachelorWindow | undefined {
  if (!value) return undefined;
  return {
    bachelor1: normalizeBachelor(value.bachelor1),
    bachelor2: normalizeBachelor(value.bachelor2),
    bachelor3: normalizeBachelor(value.bachelor3),
  };
}
