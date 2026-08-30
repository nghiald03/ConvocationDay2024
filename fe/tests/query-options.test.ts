import { describe, expect, test } from 'bun:test';
import {
  bachelorKeys,
  bachelorListQueryOptions,
} from '../src/features/bachelor/queries/bachelor-query-options';
import {
  checkInKeys,
  checkInListQueryOptions,
} from '../src/features/check-in/queries/check-in-query-options';

describe('feature query options', () => {
  test('bachelor list keys include every filter that changes the response', () => {
    const first = bachelorListQueryOptions({ pageIndex: 1, pageSize: 10 });
    const filtered = bachelorListQueryOptions({
      pageIndex: 1,
      pageSize: 10,
      hall: '2',
      session: '3',
      search: 'student',
    });

    expect(first.queryKey).toEqual(bachelorKeys.list({ pageIndex: 1, pageSize: 10 }));
    expect(filtered.queryKey).not.toEqual(first.queryKey);
    expect(filtered.queryKey).toEqual(
      bachelorKeys.list({
        pageIndex: 1,
        pageSize: 10,
        hall: '2',
        session: '3',
        search: 'student',
      })
    );
  });

  test('check-in list options use the feature-owned key', () => {
    expect(checkInListQueryOptions.queryKey).toEqual(checkInKeys.list());
  });
});
