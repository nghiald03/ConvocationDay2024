import { describe, expect, test } from 'bun:test';
import type { AppDatabase } from '../database/database.types.js';
import type { RealtimeService } from '../realtime/realtime.service.js';
import { UsersService } from './users.service.js';

/** DB giả chấp nhận mọi lệnh ghi; chỉ cần transaction chạy xong để kiểm tra việc ngắt kết nối realtime sau đó. */
function createService() {
  const disconnected: string[] = [];
  const chain: Record<string, unknown> = {};
  const touch = () => chain;
  for (const name of ['set', 'where', 'values', 'returning', 'onConflictDoNothing']) chain[name] = touch;
  chain.then = (resolve: (value: unknown[]) => unknown) => Promise.resolve([{ id: 'x' }]).then(resolve);
  const transaction = { update: () => chain, delete: () => chain, insert: () => chain, select: () => chain };
  const database = {
    transaction: (operation: (value: typeof transaction) => Promise<unknown>) => operation(transaction),
  } as unknown as AppDatabase;
  const realtime = { disconnectUser: (id: string) => disconnected.push(id) } as unknown as RealtimeService;
  const service = new UsersService(database, realtime);
  // `get` và kiểm tra vai trò đọc DB thật; thay bằng bản giả vì test chỉ quan tâm việc ngắt kết nối.
  Object.assign(service, {
    get: () => Promise.resolve({ id: 'u1', roles: ['CK'], disabled: false }),
    assertRolesExist: () => Promise.resolve(),
    assertAnotherManager: () => Promise.resolve(),
  });
  return { service, disconnected };
}

describe('UsersService: ngắt kết nối realtime khi quyền của tài khoản đổi', () => {
  test('đổi vai trò thì ngắt kết nối đang mở (phòng role cũ không còn đúng)', async () => {
    const { service, disconnected } = createService();

    await service.update('actor', 'u1', { roles: ['NO'] });

    expect(disconnected).toEqual(['u1']);
  });

  test('khóa tài khoản thì ngắt kết nối', async () => {
    const { service, disconnected } = createService();

    await service.update('actor', 'u1', { disabled: true });

    expect(disconnected).toEqual(['u1']);
  });

  test('chỉ đổi tên hoặc phòng check-in thì không ngắt kết nối', async () => {
    const { service, disconnected } = createService();

    await service.update('actor', 'u1', { name: 'Tên mới' });
    await service.update('actor', 'u1', { checkinRooms: ['P.101'] });

    expect(disconnected).toHaveLength(0);
  });

  test('đổi mật khẩu thì ngắt kết nối vì mọi phiên đã bị xóa', async () => {
    const { service, disconnected } = createService();

    await service.setPassword('u1', 'MatKhauMoi#2026');

    expect(disconnected).toEqual(['u1']);
  });

  test('xóa tài khoản thì ngắt kết nối', async () => {
    const { service, disconnected } = createService();

    await service.delete('actor', 'u1');

    expect(disconnected).toEqual(['u1']);
  });
});
