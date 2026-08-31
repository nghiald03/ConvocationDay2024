import { describe, expect, test } from 'bun:test';
import { API_HEALTH_PATH } from '../src/lib/http/get-api-health';

describe('API health contract', () => {
  test('dùng readiness endpoint của NestJS', () => {
    expect(API_HEALTH_PATH).toBe('/health/ready');
  });
});
