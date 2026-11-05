import { describe, expect, test } from 'bun:test';
import type { BachelorService } from '../bachelor/bachelor.service.js';
import type { AppDatabase } from '../database/database.types.js';
import { nextChairAtEnd } from '../bachelor/next-chair-at-end.js';
import { assertForceCheckInGap, CheckInService } from './checkin.service.js';

const allRooms = { unrestricted: true } as const;

type Row = Record<string, unknown>;

function createService(options: {
  bachelor: Row;
  checkIn: Row | undefined;
  otherChairs?: (string | null)[];
}) {
  const updates: Row[] = [];
  // Thứ tự truy vấn có khóa: tân cử nhân rồi đến dòng check-in; truy vấn ghế không khóa.
  const lockedRows = [options.bachelor, options.checkIn];
  const transaction = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => ({
            for: () => {
              const row = lockedRows.shift();
              return Promise.resolve(row ? [row] : []);
            },
          }),
          then: (resolve: (rows: { chair: string | null; sessionId: unknown }[]) => void) =>
            resolve(
              (options.otherChairs ?? []).map((chair) => ({
                chair,
                sessionId: options.bachelor.sessionId,
              })),
            ),
        }),
      }),
    }),
    update: () => ({
      set: (values: Row) => ({
        where: () => ({
          returning: () => {
            updates.push(values);
            return Promise.resolve([{ ...options.bachelor, ...values }]);
          },
        }),
      }),
    }),
  };
  const database = {
    transaction: (operation: (value: typeof transaction) => Promise<unknown>) =>
      operation(transaction),
  } as unknown as AppDatabase;
  const service = new CheckInService(database, {} as BachelorService);
  return { service, updates };
}

function rejectionMessage(operation: Promise<unknown>): Promise<string | null> {
  return operation.then(
    () => null,
    (error: Error) => error.message,
  );
}

const lateBachelor = {
  id: 7,
  studentCode: 'SV007',
  hallId: 1,
  sessionId: 3,
  chair: '7',
  chairParent: 'PH7',
  checkIn: false,
};

describe('nextChairAtEnd', () => {
  test('lấy ghế lớn nhất + 1 thay vì lấp ghế trống ở giữa', () => {
    expect(nextChairAtEnd(['1', '2', '4', '10'])).toBe('11');
  });

  test('so sánh theo số, không theo chuỗi', () => {
    expect(nextChairAtEnd(['9', '10'])).toBe('11');
  });

  test('phiên chưa có ghế bắt đầu từ 1', () => {
    expect(nextChairAtEnd([null])).toBe('1');
    expect(nextChairAtEnd([])).toBe('1');
  });

  test('sơ đồ ghế theo hàng: xếp vào hàng Z để đứng sau mọi ghế thật', () => {
    expect(nextChairAtEnd(['A01', 'I24', 'J35'])).toBe('Z01');
    expect(nextChairAtEnd(['A01', 'A24', null, 'Z01', 'Z09'])).toBe('Z10');
    expect(nextChairAtEnd(['A01', 'A24', 'z02'])).toBe('Z03');
  });

  test('sơ đồ ghế theo hàng lẫn ghế số vẫn dùng hàng Z', () => {
    expect(nextChairAtEnd(['A01', '3'])).toBe('Z01');
  });

  const right = ['A1', 'A24', 'J24'];
  const left = ['A25', 'I46', 'J50'];

  test('bên Right không tràn sang số của bên Left', () => {
    expect(nextChairAtEnd(right)).toBe('Z1');
    expect(nextChairAtEnd([...right, 'Z23'])).toBe('Z24');
    expect(nextChairAtEnd([...right, 'Z24'])).toBe('ZA1');
    expect(nextChairAtEnd([...right, 'Z24', 'ZA1'])).toBe('ZA2');
    expect(nextChairAtEnd([...right, 'Z24', 'ZA24'])).toBe('ZB1');
  });

  test('bên Left bắt đầu từ số của bên Left và không về số của bên Right', () => {
    expect(nextChairAtEnd(left)).toBe('Z25');
    expect(nextChairAtEnd([...left, 'Z49'])).toBe('Z50');
    expect(nextChairAtEnd([...left, 'Z50'])).toBe('ZA25');
    expect(nextChairAtEnd([...left, 'Z1'])).toBe('Z25');
  });

  test('dãy số lấy theo cả hội trường, không theo riêng phiên ít ghế', () => {
    expect(nextChairAtEnd(['A25', 'I41', 'Z41'], ['A25', 'J50', 'A25', 'I41', 'Z41'])).toBe('Z42');
    expect(nextChairAtEnd([], left)).toBe('Z25');
  });

  test('giữ đúng kiểu ghế của dữ liệu và ghế Z01 đã cấp', () => {
    expect(nextChairAtEnd(['A1', 'J24', 'Z01'])).toBe('Z2');
    expect(nextChairAtEnd(['A01', 'J24', 'Z09'])).toBe('Z10');
  });
});

describe('CheckInService.checkInBachelor', () => {
  test('tài khoản giới hạn phòng không check-in được phòng khác và không ghi gì', async () => {
    const { service, updates } = createService({
      bachelor: { ...lateBachelor, checkinRoom: 'Phòng 102' },
      checkIn: { id: 1, status: true },
    });

    expect(
      await rejectionMessage(
        service.checkInBachelor('SV007', true, { unrestricted: false, rooms: ['Phòng 101'] }),
      ),
    ).toBe('Bạn không được phân quyền check-in phòng Phòng 102.');
    expect(updates).toHaveLength(0);
  });

  test('tài khoản giới hạn phòng check-in được phòng của mình, không phân biệt hoa thường', async () => {
    const { service, updates } = createService({
      bachelor: { ...lateBachelor, checkinRoom: 'PHÒNG 101' },
      checkIn: { id: 1, status: true },
    });

    const result = await service.checkInBachelor('SV007', true, {
      unrestricted: false,
      rooms: ['phòng 101'],
    });

    expect(result.late).toBe(false);
    expect(updates).toHaveLength(1);
  });

  test('tài khoản giới hạn phòng không thao tác được tân cử nhân chưa xếp phòng', async () => {
    const { service, updates } = createService({
      bachelor: { ...lateBachelor, checkinRoom: null },
      checkIn: { id: 1, status: true },
    });

    expect(
      await rejectionMessage(
        service.checkInBachelor('SV007', true, { unrestricted: false, rooms: ['Phòng 101'] }),
      ),
    ).toBe('Tân cử nhân chưa được xếp phòng check-in, vui lòng liên hệ quản lý.');
    expect(updates).toHaveLength(0);
  });

  test('phiên đang mở: check-in bình thường và giữ nguyên ghế', async () => {
    const { service, updates } = createService({
      bachelor: lateBachelor,
      checkIn: { id: 1, status: true },
      otherChairs: ['8', '100'],
    });

    const result = await service.checkInBachelor('SV007', true, allRooms);

    expect(result.late).toBe(false);
    expect(result.bachelor.chair).toBe('7');
    expect(updates[0]).toMatchObject({ checkIn: true, status: true, attendanceStatus: 1 });
    expect(updates[0]).not.toHaveProperty('chair');
  });

  test('phiên đã khóa: tự xuống cuối phiên, check-in và giữ trạng thái đi trễ', async () => {
    const { service, updates } = createService({
      bachelor: lateBachelor,
      checkIn: { id: 1, status: false },
      otherChairs: ['1', '2', '100'],
    });

    const result = await service.checkInBachelor('sv007', true, allRooms);

    expect(result.late).toBe(true);
    expect(result.bachelor.chair).toBe('101');
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      chair: '101',
      chairParent: 'PH101',
      checkIn: true,
      status: true,
      attendanceStatus: 2,
    });
  });

  test('phiên đã khóa: ghế theo hàng xuống cuối phiên mà vẫn giữ hội trường và phiên', async () => {
    const { service, updates } = createService({
      bachelor: lateBachelor,
      checkIn: { id: 1, status: false },
      otherChairs: ['A01', 'I24'],
    });

    const result = await service.checkInBachelor('sv007', true, allRooms);

    expect(result.late).toBe(true);
    expect(updates[0]).toMatchObject({ chair: 'Z01', chairParent: 'PHZ01', attendanceStatus: 2 });
    expect(updates[0]).not.toHaveProperty('hallId');
    expect(updates[0]).not.toHaveProperty('sessionId');
  });

  test('phiên đã khóa: quét lại người đã check-in không đổi ghế', async () => {
    const { service, updates } = createService({
      bachelor: { ...lateBachelor, checkIn: true, chair: '101' },
      checkIn: { id: 1, status: false },
      otherChairs: ['1', '100'],
    });

    const result = await service.checkInBachelor('SV007', true, allRooms);

    expect(result.late).toBe(false);
    expect(result.bachelor.chair).toBe('101');
    expect(updates).toHaveLength(0);
  });

  test('phiên đã khóa: từ chối hủy check-in', async () => {
    const { service, updates } = createService({
      bachelor: { ...lateBachelor, checkIn: true },
      checkIn: { id: 1, status: false },
    });

    expect(await rejectionMessage(service.checkInBachelor('SV007', false, allRooms, 'SV007'))).toBe(
      'Phiên đã khóa nên không thể hủy check-in. Vui lòng mở lại phiên trước.',
    );
    expect(updates).toHaveLength(0);
  });

  test.each([
    ['chưa mở', { id: 1, status: null }],
    ['chưa có dòng check-in', undefined],
  ])('từ chối khi phiên %s và không đổi ghế', async (_name, checkIn) => {
    const { service, updates } = createService({ bachelor: lateBachelor, checkIn });

    expect(await rejectionMessage(service.checkInBachelor('SV007', true, allRooms))).toBe(
      'Phiên này chưa được mở, vui lòng đến đúng phiên của bạn.',
    );
    expect(updates).toHaveLength(0);
  });
});

describe('CheckInService.uncheckAll', () => {
  test('xóa cả trạng thái LED để người đang chiếu check-in lại được', async () => {
    const updates: Record<string, unknown>[] = [];
    const database = {
      update: () => ({
        set: (values: Record<string, unknown>) => {
          updates.push(values);
          return Promise.resolve();
        },
      }),
    } as unknown as AppDatabase;
    const service = new CheckInService(database, {} as BachelorService);

    await service.uncheckAll();

    expect(updates).toEqual([
      { timeCheckIn: null, checkIn: false, status: false, attendanceStatus: 0, bachelorStatus: null },
    ]);
  });
});

describe('force check-in', () => {
  const ids = (count: number) => Array.from({ length: count }, (_, index) => index + 1);

  describe('assertForceCheckInGap', () => {
    test('cho phép khi người đang chiếu đứng trước đúng 15 hoặc hơn', () => {
      expect(() => assertForceCheckInGap(ids(30), 16, 1)).not.toThrow();
      expect(() => assertForceCheckInGap(ids(30), 30, 1)).not.toThrow();
    });

    test('từ chối khi còn chưa tới 15 người', () => {
      expect(() => assertForceCheckInGap(ids(30), 15, 1)).toThrow('14');
    });

    test('từ chối khi người cần check-in đã qua lượt hoặc đang chiếu', () => {
      expect(() => assertForceCheckInGap(ids(30), 3, 10)).toThrow('đã qua');
      expect(() => assertForceCheckInGap(ids(30), 10, 10)).toThrow('đã qua');
    });

    test('LED chưa chiếu ai trong phiên thì không chặn', () => {
      expect(() => assertForceCheckInGap(ids(3), 1, null)).not.toThrow();
    });
  });

  describe('CheckInService.forceCheckIn', () => {
    const target = {
      id: 100,
      studentCode: 'SV100',
      hallId: 1,
      sessionId: 3,
      checkinRoom: 'P.005',
      checkIn: false,
      chair: 'B5',
    };

    function createForceService(options: {
      target?: Row;
      ledRows?: Row[];
      ordered?: number[];
    }) {
      const updates: Row[] = [];
      let queries = 0;
      const results = [
        [options.target ?? target],
        options.ledRows ?? [],
        [options.target ?? target],
        (options.ordered ?? []).map((id) => ({ id })),
      ];
      const transaction = {
        select: () => {
          queries += 1;
          const result = results.shift() ?? [];
          const chain: Record<string, unknown> = {};
          for (const name of ['from', 'where', 'limit', 'orderBy', 'for']) chain[name] = () => chain;
          chain.then = (resolve: (rows: unknown[]) => unknown) => Promise.resolve(result).then(resolve);
          return chain;
        },
        update: () => ({
          set: (values: Row) => ({
            where: () => ({
              returning: () => {
                updates.push(values);
                return Promise.resolve([{ ...target, ...values }]);
              },
            }),
          }),
        }),
      };
      const database = {
        transaction: (operation: (value: typeof transaction) => Promise<unknown>) => operation(transaction),
      } as unknown as AppDatabase;
      return { service: new CheckInService(database, {} as BachelorService), updates, queries: () => queries };
    }

    const current = (id: number) => ({ id, bachelorStatus: 'Current' });

    test('đủ khoảng cách: check-in, giữ nguyên ghế, bỏ qua trạng thái phiên', async () => {
      const ordered = [...ids(20), 100];
      const { service, updates } = createForceService({ ledRows: [current(5)], ordered });

      const result = await service.forceCheckIn('sv100', allRooms);

      expect(result.late).toBe(false);
      expect(updates).toHaveLength(1);
      expect(updates[0]).toMatchObject({ checkIn: true, status: true, attendanceStatus: 1 });
      expect(updates[0]).not.toHaveProperty('chair');
      expect(updates[0]).not.toHaveProperty('sessionId');
    });

    test('chưa đủ 15 người thì báo lỗi và không ghi', async () => {
      const ordered = [...ids(10), 100];
      const { service, updates } = createForceService({ ledRows: [current(5)], ordered });

      expect(await rejectionMessage(service.forceCheckIn('SV100', allRooms))).toContain('15');
      expect(updates).toHaveLength(0);
    });

    test('đã check-in rồi thì báo lỗi', async () => {
      const { service, updates } = createForceService({ target: { ...target, checkIn: true } });

      expect(await rejectionMessage(service.forceCheckIn('SV100', allRooms))).toContain('đã check-in');
      expect(updates).toHaveLength(0);
    });

    test('vẫn áp dụng giới hạn phòng của tài khoản', async () => {
      const { service, updates } = createForceService({});

      const message = await rejectionMessage(
        service.forceCheckIn('SV100', { unrestricted: false, rooms: ['P.999'] }),
      );
      expect(message).not.toBeNull();
      expect(updates).toHaveLength(0);
    });
  });
});

describe('thông báo force check-in', () => {
  test('nêu ghế đang chiếu, số lượt còn lại và cách tính', () => {
    let message = '';
    try {
      assertForceCheckInGap([1, 2, 3, 4], 4, 1, 'A2');
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('ghế A2');
    expect(message).toContain('3 lượt');
    expect(message).toContain('đã check-in');
    expect(message).toContain('15');
  });
});
