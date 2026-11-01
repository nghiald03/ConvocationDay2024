import { normalizeHttpError } from './errors';

import axios from 'axios';

export function getHttpErrorMessage(error: unknown, fallback: string) {
  // Plain errors thrown by API helpers already carry a user-facing message.
  if (error instanceof Error && !axios.isAxiosError(error)) return error.message || fallback;
  const message = normalizeHttpError(error).message;
  return message === 'Unexpected error' ? fallback : message;
}
