import { expect, test } from 'bun:test';
import { deleteAllBachelorsRequestConfig } from '../src/features/bachelor/api/delete-all-bachelors';

test('delete-all bachelor requests require the destructive confirmation header', () => {
  expect(deleteAllBachelorsRequestConfig.headers).toEqual({
    'X-Confirm-Destructive': 'DELETE ALL BACHELORS',
  });
});
