import type { Bachelor } from '@/features/bachelor/model/bachelor';

export type LedBachelorWindow = {
  bachelor1: Bachelor | null;
  bachelor2: Bachelor | null;
  bachelor3: Bachelor | null;
};

export type InitialLedBachelors = {
  user1: Bachelor | null;
  user2: Bachelor | null;
};
