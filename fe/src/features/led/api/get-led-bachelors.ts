import type { ApiResponse } from '@/lib/http/api-response';
import { httpClient } from '@/lib/http/client';
import type { InitialLedBachelors, LedBachelorWindow } from '../model/led-bachelors';
import type { Bachelor } from '@/features/bachelor/model/bachelor';

type RawLedBachelorWindow = {
  bachelor1: Bachelor | string | null;
  bachelor2: Bachelor | string | null;
  bachelor3: Bachelor | string | null;
};

function normalizeBachelor(value: Bachelor | string | null) {
  return typeof value === 'object' && value !== null ? value : null;
}

function normalizeWindow(value?: RawLedBachelorWindow): LedBachelorWindow | undefined {
  if (!value) return undefined;
  return {
    bachelor1: normalizeBachelor(value.bachelor1),
    bachelor2: normalizeBachelor(value.bachelor2),
    bachelor3: normalizeBachelor(value.bachelor3),
  };
}

export async function getInitialLedBachelors(hall: string, session: string) {
  const response = await httpClient.get<ApiResponse<InitialLedBachelors>>(
    '/Mc/GetBachelor1st',
    { params: { hall, session } }
  );
  return response.data.data;
}

export async function getCurrentLedBachelors(hall: string, session: string) {
  const response = await httpClient.get<ApiResponse<RawLedBachelorWindow>>(
    '/Mc/GetBachelorCurrent',
    { params: { hall, session } }
  );
  return normalizeWindow(response.data.data);
}

export async function getNextLedBachelors(hall: string, session: string) {
  const response = await httpClient.get<ApiResponse<RawLedBachelorWindow>>(
    '/Mc/GetBachelorNext',
    { params: { hall, session } }
  );
  return normalizeWindow(response.data.data);
}

export async function getPreviousLedBachelors(hall: string, session: string) {
  const response = await httpClient.get<ApiResponse<RawLedBachelorWindow>>(
    '/Mc/GetBachelorBack',
    { params: { hall, session } }
  );
  return normalizeWindow(response.data.data);
}
