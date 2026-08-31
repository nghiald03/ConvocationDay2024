import { describe, expect, test } from 'bun:test';
import { expandPermissions, Permission, permissionsByRole } from './permissions.js';

describe('ma trận phân quyền', () => {
  test('MN có toàn bộ quyền ứng dụng', () => {
    expect(expandPermissions(['MN'])).toEqual([...Object.values(Permission)].sort());
  });

  test('vai trò nghiệp vụ chỉ nhận đúng quyền và không bị trùng', () => {
    expect(expandPermissions(['ck', 'CK'])).toEqual([Permission.CheckIn]);
    expect(expandPermissions(['PQ'])).toEqual([Permission.RequestPhotoQueue]);
    expect(expandPermissions(['PC'])).toEqual([Permission.ControlPhotoQueue]);
    expect(permissionsByRole.NO).toEqual([
      Permission.ManageNotifications,
      Permission.BroadcastNotifications,
    ]);
    expect(expandPermissions(['UNKNOWN'])).toEqual([]);
  });
});
