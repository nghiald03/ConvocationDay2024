import { describe, expect, test } from 'bun:test';
import { normalizeSessionUser } from '../src/features/auth/model/normalize-session-user';

describe('normalizeSessionUser', () => {
  test('chuyển contract NestJS userId/roles sang model frontend tương thích', () => {
    const user = normalizeSessionUser({
      userId: 'test-user-mn',
      email: 'manager.test@convocation.local',
      fullName: 'Quản lý thử nghiệm',
      roles: ['MN'],
      permissions: ['bachelors.manage', 'system.manage'],
    });

    expect(user).toEqual({
      id: 'test-user-mn',
      email: 'manager.test@convocation.local',
      fullName: 'Quản lý thử nghiệm',
      role: 'MN',
      roles: ['MN'],
      permissions: ['bachelors.manage', 'system.manage'],
    });
  });
});
