import { describe, expect, test } from 'bun:test';
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
