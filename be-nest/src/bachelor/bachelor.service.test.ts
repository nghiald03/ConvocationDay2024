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

describe('BachelorService chuyển phiên', () => {
  const allRooms = { unrestricted: true } as const;
  const student = {
    id: 7,
    studentCode: 'SV007',
    hallId: 1,
    sessionId: 2,
    checkIn: false,
    checkinRoom: 'P.005',
    chair: 'A05',
  };
  const target = { id: 3, sessionNumber: 3, sessionInDay: 3 };

  function createService(selectResults: unknown[][]) {
    const updates: Record<string, unknown>[] = [];
    const queue = [...selectResults];
    const query = () => {
      const result = queue.shift() ?? [];
      const chain = {
        from: () => chain,
        where: () => chain,
        limit: () => chain,
        for: () => chain,
        then: (resolve: (rows: unknown[]) => unknown) => Promise.resolve(result).then(resolve),
      };
      return chain;
    };
    const transaction = {
      select: query,
      insert: () => ({ values: () => ({ onConflictDoNothing: () => Promise.resolve() }) }),
      update: () => ({
        set: (values: Record<string, unknown>) => ({
          where: () => ({
            returning: () => {
              updates.push(values);
              return Promise.resolve([{ ...student, ...values }]);
            },
          }),
        }),
      }),
    };
    const database = {
      transaction: (run: (tx: typeof transaction) => unknown) => run(transaction),
    } as unknown as AppDatabase;
    return { service: new BachelorService(database), updates };
  }

  const targetChairs = [{ chair: 'A01' }, { chair: 'I24' }, { chair: 'Z01' }];

  test('chuyển sang phiên khác: xuống cuối phiên đích, không lấy ghế 1', async () => {
    const { service, updates } = createService([[student], [target], [{ id: 9 }], targetChairs]);

    await service.transferLateStudent('sv007', target.id, allRooms);

    expect(updates[0]).toMatchObject({
      sessionId: target.id,
      chair: 'Z02',
      chairParent: 'PHZ02',
      attendanceStatus: 2,
    });
    expect(updates[0]).not.toHaveProperty('hallId');
  });

  test('chuyển vào phiên tạm: xuống cuối phiên đích, không lấy ghế 1', async () => {
    const { service, updates } = createService([
      [student],
      [target],
      [{ id: 9 }],
      targetChairs,
      [{ id: 1, name: 'Khu vực 1' }],
    ]);

    await service.moveToTemporarySession('sv007', true, allRooms);

    expect(updates[0]).toMatchObject({ sessionId: target.id, chair: 'Z02', chairParent: 'PHZ02' });
    expect(updates[0]).not.toHaveProperty('hallId');
  });

  test('phiên đích đánh số thường vẫn lấy ghế lớn nhất + 1', async () => {
    const { service, updates } = createService([
      [student],
      [target],
      [{ id: 9 }],
      [{ chair: '1' }, { chair: '2' }, { chair: '4' }],
    ]);

    await service.transferLateStudent('sv007', target.id, allRooms);

    expect(updates[0]).toMatchObject({ chair: '5', chairParent: 'PH5' });
  });
});
