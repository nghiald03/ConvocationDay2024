import { describe, expect, test } from 'bun:test';
import { canAccessMenu, getMenuList } from '../src/lib/menus';

const visibleTo = (role: string) =>
  getMenuList('/')
    .filter((group) => group.roleAccess?.includes(role))
    .flatMap((group) => group.menus.filter((menu) => canAccessMenu(group, menu, role)).map((menu) => menu.id));

describe('canAccessMenu', () => {
  test('mục có roleAccess riêng thì theo mục, không thì theo nhóm, không đặt gì thì ai cũng thấy', () => {
    expect(canAccessMenu({ roleAccess: ['CK', 'MN'] }, { roleAccess: ['MN'] }, 'CK')).toBe(false);
    expect(canAccessMenu({ roleAccess: ['CK', 'MN'] }, { roleAccess: ['MN'] }, 'MN')).toBe(true);
    expect(canAccessMenu({ roleAccess: ['CK'] }, {}, 'CK')).toBe(true);
    expect(canAccessMenu({ roleAccess: ['CK'] }, {}, 'MN')).toBe(false);
    expect(canAccessMenu({}, {}, 'NO')).toBe(true);
  });
});

describe('menu của trang điều phối', () => {
  test('Danh sách đến trễ ẩn với CK, hiện với CL và MN', () => {
    expect(visibleTo('CK')).not.toContain('lateQueue');
    expect(visibleTo('CL')).toContain('lateQueue');
    expect(visibleTo('MN')).toContain('lateQueue');
  });

  test('CK dùng Sơ đồ check-in đầu giờ, không thấy Sơ đồ ghế trực tiếp', () => {
    expect(visibleTo('CK')).toContain('checkin');
    expect(visibleTo('CK')).toContain('seat-board');
    expect(visibleTo('CK')).not.toContain('seatLive');
  });

  test('US (cùng quyền với MC) dùng Sơ đồ ghế trực tiếp và các trang điều khiển LED, không có sơ đồ đầu giờ', () => {
    for (const role of ['US', 'MC']) {
      expect(visibleTo(role)).toContain('seatLive');
      expect(visibleTo(role)).toContain('MCController');
      expect(visibleTo(role)).toContain('ledQueue');
      expect(visibleTo(role)).not.toContain('seat-board');
    }
  });

  test('CL dùng sơ đồ đầu giờ và danh sách đến trễ; Manager thấy cả hai sơ đồ', () => {
    expect(visibleTo('CL')).toContain('seat-board');
    expect(visibleTo('CL')).not.toContain('seatLive');
    expect(visibleTo('MN')).toContain('seat-board');
    expect(visibleTo('MN')).toContain('seatLive');
  });

  test('mỗi đường dẫn chỉ khai báo một lần để lớp chặn truy cập không nhầm nhóm', () => {
    const hrefs = getMenuList('/').flatMap((group) => group.menus.map((menu) => menu.href));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  test('hai mục Sơ đồ chỗ ngồi cũ đã ẩn với mọi vai trò', () => {
    const ids = getMenuList('/').flatMap((group) => group.menus.map((menu) => menu.id));
    expect(ids).not.toContain('seat-map');
    expect(ids).not.toContain('chongoi');
  });
});
