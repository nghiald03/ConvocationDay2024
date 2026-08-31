import { describe, expect, test } from 'bun:test';
import { isLoopbackDevelopmentOrigin } from './events.gateway.js';

describe('isLoopbackDevelopmentOrigin', () => {
  test('trusts localhost origins only in development', () => {
    expect(isLoopbackDevelopmentOrigin('http://localhost:3000', 'development')).toBe(true);
    expect(isLoopbackDevelopmentOrigin('http://127.0.0.1:3000', 'development')).toBe(true);
    expect(isLoopbackDevelopmentOrigin('http://localhost:3000', 'production')).toBe(false);
  });

  test('does not trust arbitrary LAN origins implicitly', () => {
    expect(isLoopbackDevelopmentOrigin('http://192.168.1.10:3000', 'development')).toBe(false);
  });
});
