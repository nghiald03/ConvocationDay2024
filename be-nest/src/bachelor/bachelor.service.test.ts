import { describe, expect, test } from 'bun:test';
import { expandPermissions } from '../auth/permissions.js';
import type { ActorContext } from '../common/guards/actor-context.js';
import type { AppDatabase } from '../database/database.types.js';
import type { BachelorDto } from './dto/bachelor.dto.js';
import { BachelorService } from './bachelor.service.js';

const bachelor: BachelorDto = {
  image: '',
  fullName: 'Nguyễn Văn A',
  major: 'Công nghệ thông tin',
  studentCode: 'SV001',
  mail: 'sv001@example.edu.vn',
  hallName: 'A',
  sessionNum: 1,
  chair: 'A1',
  chairParent: 'A',
};

describe('BachelorService.checkInRoomScope', () => {
  const actorWith = (roles: string[]): ActorContext => ({
    userId: 'user-1',
    email: 'user@example.edu.vn',
    fullName: 'Người dùng',
    roles,
    permissions: expandPermissions(roles),
  });
  const databaseWithRooms = (rooms: string[]) =>
    ({
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => Promise.resolve(rooms.map((room) => ({ room }))),
          }),
        }),
      }),
    }) as unknown as AppDatabase;

  test('CL được check-in mọi phòng dù không được phân phòng', async () => {
    const service = new BachelorService(databaseWithRooms([]));
    expect(await service.checkInRoomScope(actorWith(['CL']))).toEqual({ unrestricted: true });
  });

  test('tài khoản vừa CK vừa CL không bị phân phòng của CK giới hạn', async () => {
    const service = new BachelorService(databaseWithRooms(['P.005']));
    expect(await service.checkInRoomScope(actorWith(['CK', 'CL']))).toEqual({ unrestricted: true });
  });

  test('CK vẫn chỉ được check-in phòng đã phân', async () => {
    const service = new BachelorService(databaseWithRooms(['P.005']));
    expect(await service.checkInRoomScope(actorWith(['CK']))).toEqual({
      unrestricted: false,
      rooms: ['P.005'],
    });
  });
});

describe('BachelorService bulk error messages', () => {
  test('không để lộ lỗi PostgreSQL tiếng Anh khi import thất bại', async () => {
    const database = {
      transaction: () => Promise.reject(new Error('duplicate key value violates unique constraint')),
    } as unknown as AppDatabase;
    const service = new BachelorService(database);

    expect(await service.addMany([bachelor])).toEqual([
      'Không thể thêm tân cử nhân SV001.',
    ]);
  });

  test('trả lỗi tiếng Việt khi không tìm thấy tân cử nhân cần cập nhật', async () => {
    const database = {
      transaction: (operation: (transaction: unknown) => Promise<void>) =>
        operation({
          update: () => ({
            set: () => ({
              where: () => ({ returning: () => Promise.resolve([]) }),
            }),
          }),
        }),
    } as unknown as AppDatabase;
    const service = new BachelorService(database);

    expect(await service.updateMany([bachelor], 1, 1)).toEqual([
      'Tân cử nhân SV001 không tồn tại!',
    ]);
  });
});
