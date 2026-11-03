import { describe, expect, test } from 'bun:test';
import type { AppDatabase } from '../database/database.types.js';
import { MediaService } from './media.service.js';
import type { MediaValidatorService } from './media-validator.service.js';
import type { ObjectStorageService } from './object-storage.service.js';

function file(name: string): Express.Multer.File {
  return { originalname: name } as Express.Multer.File;
}

describe('MediaService.objectKey', () => {
  test('ảnh thư viện dùng chung không phụ thuộc tài khoản tải lên', () => {
    const service = new MediaService(
      {} as AppDatabase,
      {} as ObjectStorageService,
      {} as MediaValidatorService,
    );
    const id = '11111111-2222-3333-4444-555555555555';
    const expected = 'library/11111111222233334444555555555555.webp';

    expect(service.objectKey('library', 'user-a', id)).toBe(expected);
    expect(service.objectKey('library', 'user-b', id)).toBe(expected);
  });
});

describe('MediaService bulk upload', () => {
  test('xóa metadata và object đã tạo khi một tệp sau đó tải lên thất bại', async () => {
    const deletedObjects: string[] = [];
    let inserted = 0;
    let deletedRows = 0;
    const database = {
      insert: () => ({
        values: (values: Record<string, unknown>) => ({
          returning: () => {
            inserted += 1;
            return Promise.resolve([{ ...values, createdAt: new Date(), status: 0 }]);
          },
        }),
      }),
      delete: () => ({
        where: () => {
          deletedRows += 1;
          return Promise.resolve();
        },
      }),
    } as unknown as AppDatabase;
    const storage = {
      put: (key: string) =>
        inserted === 1 ? Promise.reject(new Error('MinIO unavailable')) : Promise.resolve(key),
      delete: (key: string) => {
        deletedObjects.push(key);
        return Promise.resolve();
      },
    } as unknown as ObjectStorageService;
    const validator = {
      validateAndNormalize: () =>
        Promise.resolve({
          bytes: Buffer.from('image'),
          contentType: 'image/webp',
          width: 1,
          height: 1,
        }),
    } as unknown as MediaValidatorService;
    const service = new MediaService(database, storage, validator);

    let uploadError: unknown;
    try {
      await service.uploadMany(
        [file('first.png'), file('second.png')],
        'temp',
        'actor-1',
        'actor-1',
      );
    } catch (error) {
      uploadError = error;
    }

    expect(uploadError).toBeInstanceOf(Error);
    expect((uploadError as Error).message).toBe('MinIO unavailable');
    expect(inserted).toBe(1);
    expect(deletedRows).toBe(1);
    expect(deletedObjects).toHaveLength(1);
    expect(deletedObjects[0]).toStartWith('temp/actor-1/');
  });
});
