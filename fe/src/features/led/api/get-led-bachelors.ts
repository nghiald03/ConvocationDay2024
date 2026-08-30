import type { ApiResponse } from '@/lib/http/api-response';
import { httpClient } from '@/lib/http/client';
import type { InitialLedBachelors, LedBachelorWindow } from '../model/led-bachelors';
import {
  normalizeLedBachelorWindow,
  type RawLedBachelorWindow,
} from '../model/normalize-led-bachelor-window';

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
  return normalizeLedBachelorWindow(response.data.data);
}

export async function getNextLedBachelors(hall: string, session: string) {
  const response = await httpClient.get<ApiResponse<RawLedBachelorWindow>>(
    '/Mc/GetBachelorNext',
    { params: { hall, session } }
  );
  return normalizeLedBachelorWindow(response.data.data);
}

export async function getPreviousLedBachelors(hall: string, session: string) {
  const response = await httpClient.get<ApiResponse<RawLedBachelorWindow>>(
    '/Mc/GetBachelorBack',
    { params: { hall, session } }
  );
  return normalizeLedBachelorWindow(response.data.data);
}
