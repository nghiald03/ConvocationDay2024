import axios from 'axios';

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function normalizeHttpError(error: unknown): HttpError {
  if (!axios.isAxiosError(error)) return new HttpError('Unexpected error', 500, 'unexpected', error);
  const data = error.response?.data as { message?: string; code?: string } | undefined;
  return new HttpError(
    data?.message || error.message || 'Request failed',
    error.response?.status || 0,
    data?.code || 'http/request-failed',
    data
  );
}
