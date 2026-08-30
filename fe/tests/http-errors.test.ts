import { describe, expect, test } from 'bun:test';
import { AxiosError } from 'axios';
import { HttpError, normalizeHttpError } from '../src/lib/http/errors';

describe('normalizeHttpError', () => {
  test('preserves typed API error information', () => {
    const error = new AxiosError(
      'Request failed',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        data: { message: 'Forbidden operation', code: 'permission/denied' },
        status: 403,
        statusText: 'Forbidden',
        headers: {},
        config: { headers: {} } as never,
      }
    );

    expect(normalizeHttpError(error)).toEqual(
      new HttpError('Forbidden operation', 403, 'permission/denied', {
        message: 'Forbidden operation',
        code: 'permission/denied',
      })
    );
  });

  test('keeps unknown failures at the error boundary', () => {
    const source = new Error('socket closed');
    const normalized = normalizeHttpError(source);

    expect(normalized.status).toBe(500);
    expect(normalized.code).toBe('unexpected');
    expect(normalized.details).toBe(source);
  });
});
