import { describe, expect, test } from 'bun:test';
import type { BachelorService } from '../bachelor/bachelor.service.js';
import type { AppDatabase } from '../database/database.types.js';
import { nextChairAtEnd } from '../bachelor/next-chair-at-end.js';
import { CheckInService } from './checkin.service.js';

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
          then: (resolve: (rows: { chair: string | null }[]) => void) =>
            resolve((options.otherChairs ?? []).map((chair) => ({ chair }))),
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
    expect(nextChairAtEnd(['A01', null, 'Z01', 'Z09'])).toBe('Z10');
    expect(nextChairAtEnd(['A01', 'z02'])).toBe('Z03');
  });

  test('sơ đồ ghế theo hàng lẫn ghế số vẫn dùng hàng Z', () => {
    expect(nextChairAtEnd(['A01', '3'])).toBe('Z01');
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
