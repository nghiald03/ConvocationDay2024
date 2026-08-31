import { expect, test } from 'bun:test';
import { deleteAllBachelorsRequestConfig } from '../src/features/bachelor/api/delete-all-bachelors';
import { uncheckAllRequestConfig } from '../src/features/check-in/api/uncheck-all';

test('delete-all bachelor requests require the destructive confirmation header', () => {
  expect(deleteAllBachelorsRequestConfig.headers).toEqual({
    'X-Confirm-Destructive': 'DELETE ALL BACHELORS',
  });
});

test('uncheck-all requests require the destructive confirmation header', () => {
  expect(uncheckAllRequestConfig.headers).toEqual({
    'X-Confirm-Destructive': 'UNCHECK ALL BACHELORS',
  });
});
