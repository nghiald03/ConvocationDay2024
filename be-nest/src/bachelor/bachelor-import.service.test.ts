import { describe, expect, test } from 'bun:test';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { bachelors } from '../database/schema/domain-schema.js';
import type { AppDatabase } from '../database/database.types.js';
import { BachelorImportService, MAX_IMPORT_ERROR_MESSAGES } from './bachelor-import.service.js';
import { BachelorService, IMPORT_BATCH_SIZE, type ImportProgress } from './bachelor.service.js';
import type { BachelorDto } from './dto/bachelor.dto.js';

const person = (code: string, extra: Partial<BachelorDto> = {}): BachelorDto => ({
  image: '',
  fullName: `Tên ${code}`,
  major: 'CNTT',
  studentCode: code,
  mail: `${code.toLowerCase()}@example.edu.vn`,
  hallName: 'A',
  sessionNum: 1,
  chair: 'A01',
  chairParent: 'P1',
  ...extra,
});

const people = (count: number) => Array.from({ length: count }, (_, index) => person(`SV${index + 1}`));

type Row = Record<string, unknown>;

/** DB giả: ghi lại các lần INSERT vào bảng bachelor và số transaction đã mở. */
function createDatabase(options: { existing?: string[]; rejectRow?: (row: Row) => boolean } = {}) {
  const inserts: Row[][] = [];
  const stats = { transactions: 0, existingLookups: 0 };

  const thenable = <T>(rows: T[]) => {
    const chain: Record<string, unknown> = {};
    for (const name of ['from', 'where', 'limit']) chain[name] = () => chain;
    chain.then = (resolve: (value: T[]) => unknown) => Promise.resolve(rows).then(resolve);
    return chain;
  };

  const database = {
    select: () => {
      stats.existingLookups += 1;
      return thenable((options.existing ?? []).map((code) => ({ code: code.toLowerCase() })));
    },
    transaction: async (operation: (transaction: unknown) => Promise<unknown>) => {
      stats.transactions += 1;
      // Mỗi transaction tìm side rồi tìm phiên: trả về dòng đã có sẵn nên không cần tạo.
      const lookups: Row[][] = [[{ id: 10, name: 'A' }], [{ id: 20, sessionNumber: 1, sessionInDay: 1 }]];
      const transaction = {
        select: () => thenable(lookups.shift() ?? []),
        update: () => ({ set: () => ({ where: () => ({ returning: () => Promise.resolve([]) }) }) }),
        insert: (table: unknown) => ({
          values: (value: Row | Row[]) => {
            if (table !== bachelors) return Object.assign(Promise.resolve(), { onConflictDoNothing: () => Promise.resolve() });
            const rows = Array.isArray(value) ? value : [value];
            if (rows.some((row) => options.rejectRow?.(row))) throw new Error('duplicate key value violates unique constraint');
            inserts.push(rows);
            return Promise.resolve();
          },
        }),
      };
      return operation(transaction);
    },
  } as unknown as AppDatabase;
  return { database, inserts, stats };
}

describe('BachelorService.addMany theo lô', () => {
  test('ghi theo lô thay vì từng dòng, tra trùng một lần và báo tiến độ', async () => {
    const { database, inserts, stats } = createDatabase();
    const progress: ImportProgress[] = [];

    const errors = await new BachelorService(database).addMany(people(450), (value) => progress.push({ ...value }));

    expect(errors).toEqual([]);
    expect(inserts.map((rows) => rows.length)).toEqual([IMPORT_BATCH_SIZE, IMPORT_BATCH_SIZE, 50]);
    expect(stats.existingLookups).toBe(1);
    // 1 transaction tìm side và phiên cho cặp duy nhất + 3 lô, không phải 450 transaction.
    expect(stats.transactions).toBe(4);
    expect(progress.at(-1)).toEqual({ total: 450, processed: 450, added: 450, failed: 0 });
    expect(progress.map((value) => value.processed)).toEqual([...progress.map((value) => value.processed)].sort((a, b) => a - b));
    expect(inserts[0]![0]).toMatchObject({ hallId: 10, sessionId: 20, checkIn: false });
  });

  test('báo trùng với dữ liệu đã có và trùng ngay trong file, phần còn lại vẫn được ghi', async () => {
    const { database, inserts } = createDatabase({ existing: ['sv002'] });
    const input = [person('SV001'), person('SV002'), person('sv001'), person('SV003')];

    const errors = await new BachelorService(database).addMany(input);

    expect(errors).toEqual(['Tân cử nhân SV002 đã tồn tại!', 'Tân cử nhân sv001 đã tồn tại!']);
    expect(inserts.flat().map((row) => row.studentCode)).toEqual(['SV001', 'SV003']);
  });

  test('lô bị lỗi thì thử lại từng dòng và chỉ báo đúng dòng hỏng, không lộ lỗi PostgreSQL', async () => {
    const { database, inserts } = createDatabase({ rejectRow: (row) => row.studentCode === 'SV002' });

    const errors = await new BachelorService(database).addMany([person('SV001'), person('SV002'), person('SV003')]);

    expect(errors).toEqual(['Không thể thêm tân cử nhân SV002.']);
    expect(inserts.flat().map((row) => row.studentCode)).toEqual(['SV001', 'SV003']);
  });

  test('mọi transaction đều lỗi thì từng dòng báo lỗi tiếng Việt', async () => {
    const database = {
      select: () => ({ from: () => ({ where: () => Promise.resolve([]) }) }),
      transaction: () => Promise.reject(new Error('duplicate key value violates unique constraint')),
    } as unknown as AppDatabase;

    expect(await new BachelorService(database).addMany([person('SV001')])).toEqual([
      'Không thể thêm tân cử nhân SV001.',
    ]);
  });
});

describe('BachelorImportService', () => {
  /** addMany giả chờ đến khi test cho phép kết thúc, để quan sát tiến độ giữa chừng. */
  function createFake() {
    let finish!: (errors: string[] | Error) => void;
    let report!: (progress: ImportProgress) => void;
    const fake = {
      addMany: (_input: BachelorDto[], onProgress?: (progress: ImportProgress) => void) =>
        new Promise<string[]>((resolve, reject) => {
          report = onProgress!;
          finish = (result) => (result instanceof Error ? reject(result) : resolve(result));
        }),
    } as unknown as BachelorService;
    return { service: new BachelorImportService(fake), finish: (value: string[] | Error) => finish(value), report: (p: ImportProgress) => report(p) };
  }

  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  test('trả về ngay ở trạng thái đang chạy, tiến độ cập nhật theo từng bước rồi hoàn tất', async () => {
    const { service, finish, report } = createFake();

    const started = service.start(people(10));
    expect(started).toMatchObject({ status: 'running', total: 10, processed: 0, finishedAt: null });

    report({ total: 10, processed: 4, added: 3, failed: 1 });
    expect(service.get(started.id)).toMatchObject({ status: 'running', processed: 4, added: 3, failed: 1 });

    finish(['Tân cử nhân SV002 đã tồn tại!']);
    await settle();

    const done = service.get(started.id);
    expect(done).toMatchObject({ status: 'completed', processed: 10, failed: 1 });
    expect(done.errorMessages).toEqual(['Tân cử nhân SV002 đã tồn tại!']);
    expect(done.finishedAt).not.toBeNull();
  });

  test('từ chối bắt đầu lần import khác khi đang có lần import chạy', async () => {
    const { service, finish } = createFake();
    const first = service.start(people(2));

    expect(() => service.start(people(2))).toThrow(ConflictException);
    expect(service.latest()?.id).toBe(first.id);

    finish([]);
    await settle();
    expect(() => service.start(people(2))).not.toThrow();
  });

  test('lỗi hệ thống: đánh dấu thất bại bằng thông báo tiếng Việt, không lộ lỗi gốc', async () => {
    const { service, finish } = createFake();
    const started = service.start(people(3));

    finish(new Error('connect ECONNREFUSED 100.70.23.114:15434'));
    await settle();

    const failed = service.get(started.id);
    expect(failed.status).toBe('failed');
    expect(failed.message).toContain('Import thất bại');
    expect(failed.message).not.toContain('ECONNREFUSED');
  });

  test('giữ tối đa số thông báo lỗi và đánh dấu đã cắt bớt, số lỗi vẫn đủ', async () => {
    const { service, finish } = createFake();
    const started = service.start(people(5));

    finish(Array.from({ length: MAX_IMPORT_ERROR_MESSAGES + 25 }, (_, index) => `Lỗi ${index}`));
    await settle();

    const done = service.get(started.id);
    expect(done.errorMessages).toHaveLength(MAX_IMPORT_ERROR_MESSAGES);
    expect(done.errorsTruncated).toBe(true);
    expect(done.failed).toBe(MAX_IMPORT_ERROR_MESSAGES + 25);
  });

  test('mã lần import không tồn tại thì báo không tìm thấy', () => {
    expect(() => createFake().service.get('khong-co')).toThrow(NotFoundException);
  });

  test('chưa import lần nào thì latest là null', () => {
    expect(createFake().service.latest()).toBeNull();
  });
});
