import { expect, test } from 'bun:test';
import { safeRedirect } from '../src/features/auth/model/safe-redirect.mjs';

test('safeRedirect accepts only same-origin relative routes', () => {
  expect(safeRedirect('/notify?hall=1')).toBe('/notify?hall=1');
  expect(safeRedirect('https://evil.example')).toBe('/tutorial');
  expect(safeRedirect('//evil.example/path')).toBe('/tutorial');
  expect(safeRedirect('javascript:alert(1)')).toBe('/tutorial');
});
