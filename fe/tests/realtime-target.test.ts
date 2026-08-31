import { afterEach, describe, expect, test } from 'bun:test';
import { resolveRealtimeTarget } from '@/lib/realtime/use-realtime';

const originalWindow = globalThis.window;

afterEach(() => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: originalWindow,
  });
});

describe('resolveRealtimeTarget', () => {
  test('connects directly to NestJS on localhost to avoid Next.js websocket rewrites', () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { location: { hostname: 'localhost' } },
    });

    expect(resolveRealtimeTarget('/events')).toEqual({
      url: 'http://localhost:8081/events',
      path: '/socket.io',
    });
  });

  test('keeps the same-origin proxy for non-local hosts', () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { location: { hostname: '192.168.1.10' } },
    });

    expect(resolveRealtimeTarget('/events')).toEqual({
      url: '/events',
      path: '/backend-events/socket.io',
    });
  });
});
