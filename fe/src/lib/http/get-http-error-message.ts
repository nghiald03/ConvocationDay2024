import { normalizeHttpError } from './errors';

export function getHttpErrorMessage(error: unknown, fallback: string) {
  const message = normalizeHttpError(error).message;
  return message === 'Unexpected error' ? fallback : message;
}
